from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import joblib
import pandas as pd
import re
from urllib.parse import urlparse
import os
import requests
import whois
import base64
import pickle
from datetime import datetime
from dotenv import load_dotenv, find_dotenv

from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager

# --- TENSORFLOW IMPORTS ---
import tensorflow as tf
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.sequence import pad_sequences

app = Flask(__name__)
CORS(app) 

print("Initializing Enterprise Threat Intelligence System...")

# ==========================================
# SYSTEM CONFIGURATION
# ==========================================
env_path = find_dotenv()
if env_path != "":
    load_dotenv(env_path)

MODEL_PATH = 'xgboost_phishing_model.pkl'
VT_API_KEY = os.getenv('VT_API_KEY')

if not VT_API_KEY:
    print("WARNING: 'VT_API_KEY' missing in .env. VirusTotal will be bypassed.")

print("Loading XGBoost Core...")
try:
    xgb_model = joblib.load(MODEL_PATH)
except Exception as e:
    print(f"CRITICAL FAULT: Failed to load XGBoost: {e}")
    xgb_model = None

print("Loading TensorFlow Sequence Core & Tokenizer...")
try:
    # CLEAN LOAD: Environment is upgraded, no patching required.
    lstm_model = load_model('phishing_lstm.h5')
    
    with open('char_tokenizer.pkl', 'rb') as handle:
        tokenizer = pickle.load(handle)
    print("System Online: Ensemble AI (XGB + TF) loaded successfully.")
except Exception as e:
    print(f"TF LOAD FAULT: {e}")
    print("WARNING: Running in degraded mode (XGBoost only).")
    lstm_model = None
    tokenizer = None

# ==========================================
# TIER 3: PAYLOAD ANALYSIS
# ==========================================
def analyze_payload(url):
    flags = []
    try:
        res = requests.get(url, timeout=4)
        soup = BeautifulSoup(res.text, 'html.parser')
        
        if not url.startswith('https'):
            if soup.find_all('input', type='password'):
                flags.append("Insecure Password Form")
                
        if len(res.text) < 2000 and soup.find_all('script'):
            print("[Tier 3] Heavy JS detected. Spinning up Selenium Headless Chrome...")
            chrome_options = Options()
            for opt in ["--headless", "--disable-gpu", "--no-sandbox", "--window-size=1920x1080"]:
                chrome_options.add_argument(opt)
            
            service = Service(ChromeDriverManager().install())
            driver = webdriver.Chrome(service=service, options=chrome_options)
            
            try:
                driver.set_page_load_timeout(5)
                driver.get(url)
                dynamic_soup = BeautifulSoup(driver.page_source, 'html.parser')
                
                if not url.startswith('https') and dynamic_soup.find_all('input', type='password'):
                    if "Insecure Password Form" not in flags:
                        flags.append("Insecure Password Form (JS Rendered)")
                        
                if "contextmenu" in driver.page_source.lower() and "return false" in driver.page_source.lower():
                     flags.append("Inspection Blocked (No Right-Click)")
            finally:
                driver.quit()

        return flags if flags else ["Clean DOM"]
    except requests.exceptions.Timeout:
        return ["Timeout (Server non-responsive)"]
    except Exception as e:
        print(f"[Tier 3 Warning] Payload scan failed: {e}")
        return ["Scan Failed"]

# ==========================================
# TIER 2: OSINT
# ==========================================
def check_virustotal(url):
    if not VT_API_KEY: return 0
    try:
        url_id = base64.urlsafe_b64encode(url.encode()).decode().strip("=")
        api_url = f"https://www.virustotal.com/api/v3/urls/{url_id}"
        headers = {"accept": "application/json", "x-apikey": VT_API_KEY}
        response = requests.get(api_url, headers=headers, timeout=3)
        if response.status_code == 200:
            stats = response.json()['data']['attributes']['last_analysis_stats']
            return stats.get('malicious', 0) + stats.get('suspicious', 0)
        return 0
    except: return 0

def check_domain_age(domain):
    try:
        domain_info = whois.whois(domain)
        creation_date = domain_info.creation_date
        if type(creation_date) is list: creation_date = creation_date[0]
        if creation_date: return (datetime.now() - creation_date).days
    except: pass
    return -1 

# ==========================================
# TIER 1: HEURISTICS
# ==========================================
def check_heuristics(url, features):
    parsed = urlparse(url)
    if parsed.scheme and parsed.scheme.lower() not in ['http', 'https']: return "CRITICAL RISK", 100.0
    if features['has_ip'] == 1: return "CRITICAL RISK", 98.0
    if features['qty_at'] > 0 or features['qty_tilde'] > 0 or features['qty_asterisk'] > 2: return "CRITICAL RISK", 85.0
    if len(url) > 100: return "SUSPICIOUS", 60.0
    return None, None

def extract_features(url):
    features = {'url_length': len(url), 'qty_dot': url.count('.'), 'qty_hyphen': url.count('-'), 'qty_underline': url.count('_'), 'qty_slash': url.count('/'), 'qty_questionmark': url.count('?'), 'qty_equal': url.count('='), 'qty_at': url.count('@'), 'qty_and': url.count('&'), 'qty_exclamation': url.count('!'), 'qty_space': url.count(' '), 'qty_tilde': url.count('~'), 'qty_comma': url.count(','), 'qty_plus': url.count('+'), 'qty_asterisk': url.count('*'), 'qty_hashtag': url.count('#'), 'qty_dollar': url.count('$'), 'qty_percent': url.count('%')}
    try:
        parsed_url = urlparse(url)
        domain = parsed_url.netloc if parsed_url.netloc else parsed_url.path
        features['domain_length'] = len(domain)
        features['domain_qty_dot'] = domain.count('.')
    except:
        features['domain_length'] = 0; features['domain_qty_dot'] = 0
    
    ipv4_pattern = re.compile(r'(([01]?\d\d?|2[0-4]\d|25[0-5])\.){3}([01]?\d\d?|2[0-4]\d|25[0-5])')
    features['has_ip'] = 1 if ipv4_pattern.search(url) else 0
    return features

# ==========================================
# ROUTING & AI FUSION
# ==========================================
@app.route('/')
def home():
    return render_template('index.html')

@app.route('/analyze', methods=['POST'])
def analyze():
    try:
        data = request.get_json()
        url = data.get('url')
        
        if not url: return jsonify({'error': 'No URL provided'}), 400

        parsed = urlparse(url)
        domain = parsed.netloc if parsed.netloc else parsed.path
        
        features_dict = extract_features(url)
        features_df = pd.DataFrame([features_dict])

        # --- TIER 1: HEURISTICS ---
        h_status, h_score = check_heuristics(url, features_dict)
        if h_status:
            return jsonify({
                'url': url, 'risk_score': h_score, 'status': h_status,
                'domain_length': int(features_df['domain_length'].iloc[0]),
                'slashes': int(features_df['qty_slash'].iloc[0]),
                'vt_flags': "Bypassed", 'domain_age': "Bypassed",
                'payload_status': "Bypassed (Heuristics Block)"
            })

        # --- TIER 1.5: ENSEMBLE AI (XGBOOST + TENSORFLOW) ---
        xgb_risk_score = 0.0
        if xgb_model:
            xgb_prob = xgb_model.predict_proba(features_df)[0][1]
            xgb_risk_score = float(round(xgb_prob * 100, 2))
        
        lstm_risk_score = 0.0
        if lstm_model and tokenizer:
            try:
                seq = tokenizer.texts_to_sequences([url])
                padded_seq = pad_sequences(seq, maxlen=150, padding='post', truncating='post')
                lstm_prob = lstm_model.predict(padded_seq, verbose=0)[0][0]
                lstm_risk_score = float(round(lstm_prob * 100, 2))
            except Exception as e:
                print(f"TF Inference Fault: {e}")

        # AI Fusion (Max Pooling)
        ml_risk_score = max(xgb_risk_score, lstm_risk_score)

        # --- TIER 2 & 3: OSINT + PAYLOAD ---
        vt_flags = check_virustotal(url)
        domain_age = check_domain_age(domain)
        payload_flags = analyze_payload(url)
        
        final_score = ml_risk_score
        status = "SAFE"
        
        if "Insecure Password Form" in payload_flags or "Insecure Password Form (JS Rendered)" in payload_flags:
            final_score = max(final_score, 90.0) 
        elif "Inspection Blocked (No Right-Click)" in payload_flags:
            final_score = max(final_score, 65.0) 
            
        if vt_flags >= 3:
            final_score = max(final_score, 99.0)
        elif domain_age != -1 and domain_age < 30:
            final_score = max(final_score, 80.0)

        if final_score > 75: status = "CRITICAL RISK"
        elif final_score > 40: status = "SUSPICIOUS"

        age_display = f"{domain_age} days" if domain_age != -1 else "Unknown"

        return jsonify({
            'url': url, 'risk_score': final_score, 'status': status,
            'domain_length': int(features_df['domain_length'].iloc[0]),
            'slashes': int(features_df['qty_slash'].iloc[0]),
            'vt_flags': vt_flags, 'domain_age': age_display,
            'payload_status': ", ".join(payload_flags)
        })
        
    except Exception as e:
        print(f"Backend Traceback: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Internal server fault: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5001)