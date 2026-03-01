from flask import Flask, jsonify
from flask_cors import CORS
import json

app = Flask(__name__)
CORS(app)   # cho phép mọi domain

@app.route("/location")
def location():
    with open("db.json", encoding="utf-8") as f:
        data = json.load(f)
    return jsonify(data)

app.run(host="0.0.0.0", port=3000)