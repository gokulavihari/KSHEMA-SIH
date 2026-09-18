import sys
import json
sys.path.insert(0, 'backend')

from app.services.risk_service import calculate_location_risk_assessment
from app.services.relocation_service import find_location_relocation_options

print("==================================================")
print("TEST CASE 1: MODERATE LOCATION (17.601849, 78.485991)")
print("==================================================")
mod_res = calculate_location_risk_assessment(17.601849, 78.485991)
print(f"Risk Score: {mod_res['risk_score']} / 100")
print(f"Risk Level: {mod_res['risk_level']}")
print(f"Vulnerability Score: {mod_res['vulnerability_score']} / 100")
print(f"Vulnerability Level: {mod_res['vulnerability_level']}")
print(f"Evidence Coverage: {mod_res['coverage_percentage']}%")
print(f"Assessment Confidence: {mod_res['confidence']}%")
print(f"Status Banner: {mod_res['status_banner']}")
print(f"Action: {mod_res['decision']['action']}")
print(f"Relocation Required: {mod_res['relocation']['required']}")
print(f"Top 3 Risk Factors:")
for f in mod_res['factors'][:3]:
    print(f"  - {f['factor']}: Impact={f['contribution']} pts ({f['contribution_pct']}%), Status={f['status']}")
print(f"Top 3 Vulnerability Factors:")
for vf in mod_res['vulnerability']['factors'][:3]:
    print(f"  - {vf['factor']}: Score={vf['score']}/100, Weight={vf['weight']}, Status={vf['status']}")

print("\n==================================================")
print("TEST CASE 2: HIGH RISK LOCATION - RAINI (30.4852, 79.6914)")
print("==================================================")
high_res = calculate_location_risk_assessment(30.4852, 79.6914)
print(f"Risk Score: {high_res['risk_score']} / 100")
print(f"Risk Level: {high_res['risk_level']}")
print(f"Vulnerability Score: {high_res['vulnerability_score']} / 100")
print(f"Vulnerability Level: {high_res['vulnerability_level']}")
print(f"Evidence Coverage: {high_res['coverage_percentage']}%")
print(f"Assessment Confidence: {high_res['confidence']}%")
print(f"Status Banner: {high_res['status_banner']}")
print(f"Action: {high_res['decision']['action']}")
print(f"Relocation Required: {high_res['relocation']['required']}")
if high_res['relocation']['nearest_feasible_site']:
    n_site = high_res['relocation']['nearest_feasible_site']
    print(f"Nearest Feasible Safe Site: {n_site['site_name']}")
    print(f"  - Road Distance: {n_site['road_dist_km']} km")
    print(f"  - Safety Score: {n_site['safety_score']} / 100")
    print(f"  - Effective Capacity: {n_site['site_effective_capacity']}")

print("\n==================================================")
print("TEST RELOCATION SAFETY: REJECTION OF SITE-005 (TAPOVAN)")
print("==================================================")
reloc_opt = find_location_relocation_options(30.4852, 79.6914, 1250, "CRITICAL")
rejected_site_5 = [r for r in reloc_opt['rejected_sites_audit'] if 'SITE-005' in r['site_id'] or 'Tapovan' in r['site_name']]
if rejected_site_5:
    print(f"SITE-005 Rejection Status: REJECTED")
    print(f"Reason: {rejected_site_5[0]['reason']}")
    print(f"Safety Score: {rejected_site_5[0]['safety_score']}")
    print(f"Allocated Population: {rejected_site_5[0]['allocated']}")
else:
    print("SITE-005 was not found in audit list.")
