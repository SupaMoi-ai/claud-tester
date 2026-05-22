// Source: SOFT STUDIO spec. Do not paraphrase. Used by VisionProvider.
export const ENRICHMENT_PROMPT = `You analyze a Pinterest pin saved by a creative person collecting ideas for sewing, styling, interiors, DIY, and personal projects. Extract structured creative signals. Return ONLY valid JSON.

Payload: pin image + pinterest_description + pinterest_board_name

Schema:
{
  "intent_type": "outfit_inspiration | garment_construction | fabric_or_material | color_palette | interior_styling | diy_project | craft_technique | food | kid_project | beauty_or_grooming | art_or_illustration | photography_mood | travel_or_place | general_aesthetic | unclear",
  "primary_subject": "2-5 concrete words. 'beige linen blazer on hanger' not 'soft summer dream'",
  "materials": ["visible/implied, or []"],
  "techniques": ["implied, or []"],
  "dominant_colors": ["3-5 plain english names by visual weight"],
  "mood": "warm_earthy | cool_minimal | playful_bright | moody_dark | vintage_faded | soft_romantic | utilitarian | editorial_clean | cozy_textured | unclear",
  "era_or_style": "short phrase or null",
  "actionability": "reference_only | needs_materials | needs_pattern_or_instructions | ready_to_attempt | finished_example",
  "saved_signal_strength": "integer 1-5. Be honest, most pins are 2-3.",
  "confidence": "float 0.0-1.0"
}

Rules:
- Unclear → intent_type "unclear", confidence < 0.4
- Don't invent materials/techniques you can't see
- primary_subject must be concrete
- Board name is context, not ground truth`;
