import sys
import os
from pathlib import Path

# Fix Windows cp1252 console encoding so emojis never cause UnicodeEncodeError
if sys.platform.startswith("win"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import google.generativeai as genai

# Reliably load .env from the pixel folder or project root
current_dir = Path(__file__).resolve().parent
env_file = current_dir / ".env"
if env_file.exists():
    load_dotenv(env_file)
else:
    load_dotenv()

app = Flask(__name__)
CORS(app)

# Configure Gemini API
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("WARNING: GEMINI_API_KEY environment variable is not set!")

genai.configure(api_key=api_key)

SYSTEM_PROMPT = """You are Pixel, a warm, supportive, and motivating AI study companion of NoxBuddy.

Your goals:
- Help students learn concepts simply, prepare for exams, and solve study doubts.
- If a student is stressed, anxious, or overwhelmed (especially about exams or placements), validate their feelings warmly, be encouraging, and give small, clear actionable steps.
- Tone: warm, friendly, casual like a close friend, encouraging, never robotic or corporate.
- Keep responses concise (2 to 4 short paragraphs max) with occasional fitting emojis.
- Never claim to be a doctor or therapist."""

def get_model(model_name="gemini-3.5-flash-lite"):
    return genai.GenerativeModel(
        model_name=model_name,
        system_instruction=SYSTEM_PROMPT,
        generation_config={
            "max_output_tokens": 300,
            "temperature": 0.7,
        }
    )

@app.route("/", methods=["GET"])
def health_check():
    return jsonify({
        "status": "online",
        "message": "Pixel AI Backend is running smoothly 🚀"
    })

@app.route("/chat", methods=["POST"])
def chat():
    try:
        data = request.get_json(force=True, silent=True) or {}
        user_message = data.get("message", "").strip()
        history = data.get("history", [])

        if not user_message:
            return jsonify({"error": "No message received"}), 400

        # Build clean Gemini history: role must be 'user' or 'model'
        gemini_history = []
        for msg in history[-10:]:
            raw_role = msg.get("role", "user")
            role = "user" if raw_role == "user" else "model"
            content = msg.get("content", "").strip()
            if content:
                gemini_history.append({
                    "role": role,
                    "parts": [content]
                })

        # Try fast gemini-3.5-flash-lite, fallback to gemini-2.5-flash if needed
        reply_text = ""
        try:
            model = get_model("gemini-3.5-flash-lite")
            chat_session = model.start_chat(history=gemini_history)
            response = chat_session.send_message(user_message)
            reply_text = response.text.strip()
        except Exception as primary_err:
            print("Primary model error, attempting fallback:", str(primary_err))
            fallback_model = get_model("gemini-2.5-flash")
            chat_session = fallback_model.start_chat(history=gemini_history)
            response = chat_session.send_message(user_message)
            reply_text = response.text.strip()

        if not reply_text:
            reply_text = "I'm here for you! Could you try asking that once more? 😊"

        return jsonify({"response": reply_text})

    except Exception as e:
        print("Chat endpoint error:", str(e))
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"[Pixel AI] Flask server running on port {port} ...")
    app.run(host="0.0.0.0", port=port, debug=False)
