import os
import json
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

app = Flask(__name__)

KNOWLEDGE_BASE = None
SYSTEM_PROMPT = None
CLIENT = None


def load_knowledge_base():
    global KNOWLEDGE_BASE
    kb_path = os.path.join(os.path.dirname(__file__), "data", "workskills_knowledge_base.json")
    with open(kb_path, "r", encoding="utf-8") as f:
        KNOWLEDGE_BASE = json.load(f)


def get_system_prompt():
    rules = "\n".join(f"- {r}" for r in KNOWLEDGE_BASE.get("ai_assistant_answering_rules", []))
    conflicts = json.dumps(KNOWLEDGE_BASE.get("data_conflicts", []), indent=2)
    kb_summary = json.dumps(KNOWLEDGE_BASE, indent=2)

    return f"""You are a friendly, concise AI assistant for Workskills X — an IIT-certified career and placement training platform.

Your role: answer prospective students' questions about programs, fees, placements, policies, and anything related to Workskills X. Be helpful, warm, and professional.

## Grounding Rules (MANDATORY)
You MUST follow these rules strictly:
{rules}

## Known Data Conflicts on the Workskills Website
When answering, if a question touches on any of these fields, acknowledge both values rather than picking one silently:
{conflicts}

## Knowledge Base (use this as your ONLY source of information)
{kb_summary}

## Persona
- You are the Workskills X assistant.
- Be friendly, concise, and direct.
- If you don't know the answer from the knowledge base, say so and suggest contacting support@workskills.in or visiting the relevant official page.
- Never fabricate information. Never invent programs, fees, batches, placements, or policies.
- Treat all fees as current listed prices subject to change.
- Treat placement/salary/rating numbers as website marketing claims, not independently verified facts.
- Treat reviews as user-generated testimonials, not proof of outcomes.
- For refund questions, use the specific program's stated refund terms.
- Keep responses under 300 words unless the user asks for detail."""


def init_gemini():
    global CLIENT, SYSTEM_PROMPT
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable not set")
    CLIENT = genai.Client(api_key=api_key)
    SYSTEM_PROMPT = get_system_prompt()


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/knowledge")
def get_knowledge():
    kb = KNOWLEDGE_BASE
    programs = kb.get("programs", [])
    analytics = kb.get("data_analytics_program", {})
    curriculum = kb.get("data_analytics_curriculum", {})
    projects = kb.get("live_projects", [])
    tools = kb.get("tools", {})
    contact = kb.get("contact_information", {})
    recruiters = kb.get("recruiter_page", {})
    homepage = kb.get("homepage_claims", {})
    about = kb.get("about_workskills", {})
    campus = kb.get("campus_life", {})
    values = kb.get("company_values", {})
    reviews = kb.get("reviews", {})
    privacy = kb.get("privacy_policy", {})
    career = kb.get("career_path_model", {})
    identity = kb.get("organization_identity", {})

    courses = []
    for p in programs:
        course_id = p["name"].lower().replace(" ", "-").replace("&", "and").replace("  ", " ")
        course_id = course_id.replace("iit-patna-", "").replace("iit-bombay-", "").replace("iit-guwahati-", "")
        courses.append({
            "id": course_id,
            "full_id": p["name"].lower().replace(" ", "-").replace("&", "and"),
            "name": p["name"],
            "short_name": p["name"].replace("IIT Patna ", "").replace("IIT Bombay ", "").replace("IIT Guwahati ", ""),
            "institute": p["institute"],
            "positioning": p["positioning"],
            "fee": p["listed_fee_inr"],
            "emi": p.get("emi", {}),
        })

    curriculum_modules = []
    for mod in curriculum.get("modules", []):
        curriculum_modules.append({
            "name": mod["name"],
            "lesson_count": mod.get("lesson_count", 0),
            "lessons": mod.get("lessons", []),
        })

    analytics_full = {
        "name": analytics.get("name", ""),
        "positioning": analytics.get("positioning", ""),
        "eligibility": analytics.get("eligibility", {}),
        "duration": analytics.get("duration", {}),
        "placement_claims": analytics.get("placement_claims", {}),
        "benefits": analytics.get("benefits", []),
        "program_structure": analytics.get("program_structure", []),
        "certifications": analytics.get("certifications_mentioned", []),
        "pricing": analytics.get("pricing", {}),
        "curriculum": curriculum_modules,
    }

    project_guides = []
    for proj in projects:
        guide = proj.get("project_guide", {})
        if guide and guide.get("name"):
            exists = next((g for g in project_guides if g["name"] == guide["name"]), None)
            if not exists:
                project_guides.append({
                    "name": guide["name"],
                    "role": guide.get("role", ""),
                    "projects": [proj["title"]],
                })
            else:
                exists["projects"].append(proj["title"])

    all_tools = {}
    for cat, tool_list in tools.get("categories", {}).items():
        all_tools[cat] = tool_list

    stats = {
        "students_placed": "2,000+",
        "placement_assistance": "100%",
        "salary_increase": "50%",
        "hiring_companies": "500+",
        "avg_package": "₹12.4 LPA",
        "rating": "4.7",
        "ratings_count": "3,500+",
        "total_placements": "4,500+",
    }

    admission_process = recruiters.get("hiring_process", [])
    recruiter_claims = recruiters.get("recruiter_claims", {})

    return jsonify({
        "courses": courses,
        "courses_full": [
            {
                "id": c["id"],
                "full_id": c["full_id"],
                "name": c["name"],
                "short_name": c["short_name"],
                "institute": c["institute"],
                "positioning": c["positioning"],
                "fee": c["fee"],
                "emi": c["emi"],
            }
            for c in courses
        ],
        "analytics_program": analytics_full,
        "live_projects": [
            {
                "title": p["title"],
                "area": p.get("area", ""),
                "difficulty": p.get("difficulty", ""),
                "duration": p.get("duration", ""),
                "data_size": p.get("data_size", ""),
                "goal": p.get("goal", ""),
                "guide": p.get("project_guide", {}).get("name", ""),
            }
            for p in projects
        ],
        "project_guides": project_guides,
        "tools": all_tools,
        "contact": contact,
        "admission_process": admission_process,
        "recruiter_claims": recruiter_claims,
        "homepage_claims": homepage.get("claims", []),
        "about": about,
        "campus": campus,
        "values": values.get("values", []),
        "reviews": {
            "rating": reviews.get("displayed_rating"),
            "count": reviews.get("displayed_global_ratings"),
            "distribution": reviews.get("rating_distribution_pct"),
            "examples": reviews.get("examples", []),
        },
        "privacy": privacy,
        "career_path": career,
        "identity": identity,
        "stats": stats,
        "certifying_institutes": kb.get("certifying_institutes", []),
        "what_students_get": kb.get("what_students_get", []),
        "data_conflicts": kb.get("data_conflicts", []),
    })


@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json()
    if not data or "message" not in data:
        return jsonify({"error": "Missing message field"}), 400

    user_message = data["message"].strip()
    history = data.get("history", [])

    if not user_message:
        return jsonify({"error": "Message cannot be empty"}), 400

    try:
        contents = []
        for msg in history:
            role = "user" if msg.get("role") == "user" else "model"
            parts = []
            for part in msg.get("parts", []):
                if isinstance(part, dict):
                    parts.append(part.get("text", ""))
                else:
                    parts.append(str(part))
            contents.append(types.Content(role=role, parts=[types.Part.from_text(text=t) for t in parts]))

        response = CLIENT.models.generate_content(
            model="gemini-3.5-flash",
            contents=contents + [types.Part.from_text(text=user_message)],
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
            ),
        )
        return jsonify({"reply": response.text})
    except Exception as e:
        print(f"[CHAT ERROR] {type(e).__name__}: {e}")
        app.logger.error(f"Gemini API error: {e}")
        return jsonify({
            "reply": "I'm sorry, I'm having trouble connecting right now. Please try again in a moment, or reach out to us at support@workskills.in for immediate assistance."
        }), 200


if __name__ == "__main__":
    load_knowledge_base()
    init_gemini()
    app.run(debug=True, port=5000)
