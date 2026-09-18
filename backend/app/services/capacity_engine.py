from typing import Dict, Any

def calculate_site_capacity(site_data: dict, current_allocated: int = 0) -> dict:
    """
    Evaluates carrying capacity across 7 infrastructure components:
    1. Land Area Capacity (10 sqm / person standard)
    2. Water Supply Capacity (100 L / person / day)
    3. Sanitation Capacity
    4. Healthcare Access Capacity
    5. School / Education Capacity
    6. Road Network Access Capacity
    7. Emergency Service Capacity
    
    Effective Capacity = MIN(all 7 capacity components)
    Bottleneck = argmin(components)
    """
    land_cap = int(site_data["land_area_sqm"] / 10.0)
    water_cap = int(site_data["water_lpd"] / 100.0)
    sanitation_cap = site_data["sanitation_cap"]
    healthcare_cap = site_data["healthcare_cap"]
    education_cap = site_data["education_cap"]
    road_cap = site_data["road_cap"]
    emergency_cap = site_data["emergency_cap"]
    
    components = {
        "Land Area": land_cap,
        "Water Supply": water_cap,
        "Sanitation & Waste": sanitation_cap,
        "Healthcare Access": healthcare_cap,
        "Education & Schools": education_cap,
        "Road Network Access": road_cap,
        "Emergency Services": emergency_cap
    }
    
    # Calculate MIN capacity
    min_component_name = min(components, key=components.get)
    effective_capacity = max(0, components[min_component_name])
    
    remaining_capacity = max(0, effective_capacity - current_allocated)
    utilization_pct = round((current_allocated / effective_capacity * 100.0), 1) if effective_capacity > 0 else 100.0
    
    return {
        "land_capacity": land_cap,
        "water_capacity": water_cap,
        "sanitation_capacity": sanitation_cap,
        "healthcare_capacity": healthcare_cap,
        "education_capacity": education_cap,
        "road_capacity": road_cap,
        "emergency_capacity": emergency_cap,
        "effective_capacity": effective_capacity,
        "bottleneck": min_component_name,
        "used_capacity": current_allocated,
        "remaining_capacity": remaining_capacity,
        "utilization_percentage": min(100.0, utilization_pct)
    }
