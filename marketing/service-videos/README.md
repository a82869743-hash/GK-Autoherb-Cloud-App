# GK service process videos

27-second vertical videos (Neon Blade music, no voice-over) shown as the
"See the process" video on service cards. Live copies are on the server in
`/root/app/server/uploads/service-media/` and linked from the `service_media` table.

| File | Live services |
|---|---|
| foam_wash_process.mp4 | Foam Wash, Full Foam Wash, Regular Foam wash (In and out) |
| exterior_foam_wash_process.mp4 | Exterior Body Wash, Exterior Body water wash, Full Body Wash |
| platinum_wash_process.mp4 | Premium Wash, Premium Spa Wash, Foam Wash Premium |
| deep_cleaning_process.mp4 | Interior Cleaning, Seat Shampooing, Interior Deep Cleaning, Interior Detailing |
| headlight_restoration_process.mp4 | Headlight Restoration |
| windshield_treatment_process.mp4 | Windshield Treatment |
| teflon_coating_process.mp4 | Teflon Coating |
| ceramic_coating_process.mp4 | Kovalent Ceramic 9H, Nano Ceramic 9H, Body Hybrid Ceramic Wax Coat, Ceramic Wash |
| graphene_coating_process.mp4 | Graphene 10H 3 yr, Graphene 10H 5 yr |
| ppf_installation_process.mp4 | PPF (Paint Protection Film), PPF Coating |
| ac_vent_cleaning_process.mp4 | AC Vent Cleaning |
| wax_coating_process.mp4 | Body Carnauba Wax Coat |

Full-quality 1080p versions (about 94 MB each) are kept outside the repo.

`edit_template.py` is the edit used for these videos: three 10-second Google Flow clips
cut into 8 captioned steps on the music's beat (bar = 2.5263 s), then the GK end card.
