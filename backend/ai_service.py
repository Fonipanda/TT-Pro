"""AI service using Claude Sonnet 4.5 via emergentintegrations."""
import os
import json
import logging
from emergentintegrations.llm.chat import LlmChat, UserMessage

logger = logging.getLogger(__name__)

EMERGENT_LLM_KEY = os.environ['EMERGENT_LLM_KEY']
MODEL_PROVIDER = "anthropic"
MODEL_NAME = "claude-sonnet-4-5-20250929"

CHAT_SYSTEM_PROMPT = (
    "You are TT Pro Copilot, an expert table tennis assistant. "
    "You speak fluent English and French and switch based on the user's language. "
    "Help users with: player stats, world rankings, match predictions, ITTF/WTT rules, "
    "tournament info (Pro A, Pro B, Bundesliga, CSL, Champions League, WTT Grand Smash, "
    "WTT Champions, ITTF World Championships, Olympics). Be concise, accurate, "
    "use bullet points for lists. If you don't know a stat, say so honestly."
)


async def chat_reply(session_id: str, user_text: str) -> str:
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=CHAT_SYSTEM_PROMPT,
    ).with_model(MODEL_PROVIDER, MODEL_NAME)
    msg = UserMessage(text=user_text)
    return await chat.send_message(msg)


async def predict_match(match: dict, p1: dict, p2: dict) -> dict:
    """Returns dict with player1_win_probability, player2_win_probability, predicted_score, reasoning."""
    prompt = f"""Predict the outcome of this table tennis match. Return STRICT JSON only.

Match: {match['competition_name']} - {match['round_name']}
Player 1: {p1['name']} ({p1['country']}) — World rank #{p1.get('rank_world')}, {p1.get('points')} pts, recent form: {p1.get('recent_form')}, style: {p1.get('style')}
Player 2: {p2['name']} ({p2['country']}) — World rank #{p2.get('rank_world')}, {p2.get('points')} pts, recent form: {p2.get('recent_form')}, style: {p2.get('style')}

Return JSON exactly in this shape (no markdown, no extra text):
{{"player1_win_probability": 0.0-1.0, "player2_win_probability": 0.0-1.0, "predicted_score": "4-2 in sets", "reasoning": "2-3 sentences why"}}
"""
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"predict-{match['id']}",
        system_message="You are a table tennis prediction expert. Always respond with valid JSON only.",
    ).with_model(MODEL_PROVIDER, MODEL_NAME)
    response = await chat.send_message(UserMessage(text=prompt))
    # extract JSON
    text = response.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    try:
        data = json.loads(text.strip())
    except Exception as e:
        logger.error("Prediction JSON parse failed: %s — raw: %s", e, response)
        # fallback heuristic
        r1 = p1.get('rank_world') or 99
        r2 = p2.get('rank_world') or 99
        prob1 = round(1 - (r1 / (r1 + r2)), 2)
        data = {
            "player1_win_probability": prob1,
            "player2_win_probability": round(1 - prob1, 2),
            "predicted_score": "4-3 in sets",
            "reasoning": "Heuristic based on world ranking comparison.",
        }
    return data


async def summarize_match(match: dict, p1: dict, p2: dict) -> dict:
    """Returns summary + highlights list."""
    sets_str = ", ".join([f"{s[0]}-{s[1]}" for s in match.get('sets', [])])
    prompt = f"""Generate a match recap. Return STRICT JSON only.

{match['competition_name']} - {match['round_name']}
{p1['name']} ({p1['country']}) vs {p2['name']} ({p2['country']})
Final set score: {match.get('score_p1')}-{match.get('score_p2')}
Sets detail: {sets_str or 'in progress'}

Return JSON exactly:
{{"summary": "2-3 sentence engaging recap", "highlights": ["highlight 1", "highlight 2", "highlight 3"]}}
"""
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"summary-{match['id']}",
        system_message="You are a sports journalist specialized in table tennis. JSON output only.",
    ).with_model(MODEL_PROVIDER, MODEL_NAME)
    response = await chat.send_message(UserMessage(text=prompt))
    text = response.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    try:
        data = json.loads(text.strip())
    except Exception:
        data = {
            "summary": f"{p1['name']} faced {p2['name']} in a {match['round_name']} match at {match['competition_name']}.",
            "highlights": ["Match in progress or details unavailable."],
        }
    return data


async def recommend_for_user(favorites: list, recent_matches: list) -> str:
    """Generate personalized recommendations text."""
    fav_text = ", ".join(favorites) if favorites else "none yet"
    matches_text = "\n".join([f"- {m['player1_name']} vs {m['player2_name']} ({m['competition_name']})" for m in recent_matches[:8]])
    prompt = f"""Give 3 personalized table tennis recommendations.

User favorites: {fav_text}
Upcoming matches:
{matches_text}

Return a short bulleted list (3 items) recommending which matches/players they should follow next. 1-2 sentences per item."""
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id="recommendations",
        system_message=CHAT_SYSTEM_PROMPT,
    ).with_model(MODEL_PROVIDER, MODEL_NAME)
    return await chat.send_message(UserMessage(text=prompt))


async def bracket_predictor_eval(competition_name: str, predictions: list[dict]) -> dict:
    """Evaluate a user's bracket predictions and return AI score + analysis.

    `predictions`: list of {round, player1, player2, picked_winner, predicted_score?}
    """
    pred_lines = []
    for p in predictions:
        pred_lines.append(
            f"- {p.get('round','')}: {p.get('player1','?')} vs {p.get('player2','?')} → "
            f"User picks: {p.get('picked_winner','?')}"
            + (f" ({p.get('predicted_score')})" if p.get('predicted_score') else "")
        )
    pred_text = "\n".join(pred_lines) if pred_lines else "(no picks)"
    prompt = f"""You are a table tennis pundit. Evaluate the user's bracket predictions for {competition_name}.

User predictions:
{pred_text}

Return STRICT JSON only:
{{
  "overall_score": <0-100 confidence score for the user's overall bracket realism>,
  "expert_picks": [
    {{"round": "...", "expert_winner": "Name", "rationale": "1 short sentence"}},
    ...
  ],
  "agreement_count": <integer how many user picks the AI agrees with>,
  "summary": "2-3 sentences global feedback in French"
}}"""
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"bracket-{competition_name}",
        system_message="You are a TT bracket prediction expert. Reply with valid JSON only.",
    ).with_model(MODEL_PROVIDER, MODEL_NAME)
    response = await chat.send_message(UserMessage(text=prompt))
    try:
        text = response.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text.strip())
    except Exception:
        return {
            "overall_score": 50,
            "expert_picks": [],
            "agreement_count": 0,
            "summary": "Analyse IA indisponible — réessayez plus tard.",
        }
