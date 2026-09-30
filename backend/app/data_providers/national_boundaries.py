"""
Kshema National Boundary and State Geographic Dataset
Provides standardized boundaries, bounding boxes, centroid coordinates, and district listings
for Indian States and Union Territories for administrative GIS visualization.
"""

from typing import Dict, Any, List, Optional

INDIAN_STATES_DATA: Dict[str, Dict[str, Any]] = {
    "Telangana": {
        "state_code": "TG",
        "name": "Telangana",
        "center": [17.8749, 78.1008],
        "default_zoom": 7,
        "bbox": [15.83, 77.23, 19.92, 81.32],
        "districts": [
            "Medchal-Malkajgiri", "Hyderabad", "Bhadradri Kothagudem", 
            "Rangareddy", "Warangal", "Khammam", "Karimnagar", "Nalgonda", "Nizamabad"
        ],
        "boundary_polygon": [
            [19.92, 78.20], [19.80, 79.50], [19.20, 79.95], [18.70, 80.50],
            [17.80, 81.30], [17.40, 81.00], [16.80, 80.80], [16.40, 80.00],
            [15.83, 78.40], [16.10, 77.70], [16.90, 77.40], [17.60, 77.23],
            [18.50, 77.50], [19.40, 77.70], [19.92, 78.20]
        ]
    },
    "Uttarakhand": {
        "state_code": "UK",
        "name": "Uttarakhand",
        "center": [30.25, 79.20],
        "default_zoom": 8,
        "bbox": [28.71, 77.57, 31.46, 81.04],
        "districts": [
            "Chamoli", "Rudraprayag", "Tehri Garhwal", "Uttarkashi", 
            "Pauri Garhwal", "Dehradun", "Pithoragarh", "Almora", "Nainital"
        ],
        "boundary_polygon": [
            [31.46, 78.50], [31.30, 79.20], [30.90, 80.20], [30.40, 81.04],
            [29.80, 80.80], [29.20, 80.30], [28.71, 79.80], [29.20, 79.00],
            [29.60, 78.20], [30.10, 77.57], [30.80, 77.80], [31.46, 78.50]
        ]
    },
    "Himachal Pradesh": {
        "state_code": "HP",
        "name": "Himachal Pradesh",
        "center": [31.90, 77.15],
        "default_zoom": 8,
        "bbox": [30.38, 75.78, 33.22, 79.00],
        "districts": [
            "Kullu", "Mandi", "Shimla", "Kangra", "Kinnaur", "Lahaul and Spiti", "Chamba", "Solan"
        ],
        "boundary_polygon": [
            [33.22, 76.80], [33.00, 78.00], [32.00, 79.00], [31.20, 78.50],
            [30.40, 77.70], [30.38, 76.80], [31.20, 75.80], [32.20, 75.80],
            [33.22, 76.80]
        ]
    },
    "Maharashtra": {
        "state_code": "MH",
        "name": "Maharashtra",
        "center": [19.50, 75.50],
        "default_zoom": 7,
        "bbox": [15.60, 72.60, 22.02, 80.90],
        "districts": [
            "Mumbai City", "Mumbai Suburban", "Pune", "Nagpur", "Thane", "Raigad", "Ratnagiri", "Nashik", "Aurangabad"
        ],
        "boundary_polygon": [
            [22.02, 74.00], [21.80, 78.00], [21.50, 80.50], [20.50, 80.90],
            [18.80, 80.30], [18.00, 77.80], [15.60, 74.00], [16.00, 73.30],
            [19.00, 72.60], [20.20, 72.80], [21.50, 73.50], [22.02, 74.00]
        ]
    },
    "Kerala": {
        "state_code": "KL",
        "name": "Kerala",
        "center": [10.50, 76.40],
        "default_zoom": 7,
        "bbox": [8.29, 74.86, 12.80, 77.40],
        "districts": [
            "Wayanad", "Ernakulam", "Idukki", "Thiruvananthapuram", "Kozhikode", "Malappuram", "Thrissur", "Palakkad"
        ],
        "boundary_polygon": [
            [12.80, 75.00], [12.00, 76.00], [11.50, 76.40], [10.80, 76.90],
            [9.80, 77.20], [8.70, 77.40], [8.29, 77.00], [9.00, 76.50],
            [10.00, 76.20], [11.50, 75.60], [12.80, 75.00]
        ]
    },
    "Andhra Pradesh": {
        "state_code": "AP",
        "name": "Andhra Pradesh",
        "center": [15.91, 79.74],
        "default_zoom": 7,
        "bbox": [12.62, 76.76, 19.14, 84.76],
        "districts": [
            "Visakhapatnam", "East Godavari", "West Godavari", "Krishna", "Guntur", "Nellore", "Kurnool", "Anantapur"
        ],
        "boundary_polygon": [
            [19.14, 83.50], [18.50, 84.76], [16.50, 82.20], [14.00, 80.10],
            [13.50, 79.80], [12.62, 78.50], [14.00, 77.20], [15.50, 76.76],
            [16.20, 78.50], [17.50, 81.20], [19.14, 83.50]
        ]
    },
    "Bihar": {
        "state_code": "BR",
        "name": "Bihar",
        "center": [25.70, 85.80],
        "default_zoom": 7,
        "bbox": [24.28, 83.32, 27.52, 88.30],
        "districts": [
            "Patna", "Supaul", "Darbhanga", "Madhubani", "Muzaffarpur", "Bhagalpur", "Gaya", "Purnia"
        ],
        "boundary_polygon": [
            [27.52, 84.20], [27.00, 87.00], [26.50, 88.30], [25.20, 87.80],
            [24.50, 86.50], [24.28, 84.50], [25.00, 83.32], [26.00, 84.00],
            [27.52, 84.20]
        ]
    },
    "Gujarat": {
        "state_code": "GJ",
        "name": "Gujarat",
        "center": [22.50, 71.50],
        "default_zoom": 7,
        "bbox": [20.10, 68.10, 24.70, 74.40],
        "districts": [
            "Kutch", "Patan", "Ahmedabad", "Surat", "Vadodara", "Rajkot", "Jamnagar", "Bhavnagar"
        ],
        "boundary_polygon": [
            [24.70, 71.00], [24.50, 73.00], [23.50, 74.40], [21.50, 73.50],
            [20.10, 72.80], [21.00, 72.00], [20.70, 70.80], [22.50, 69.00],
            [23.50, 68.10], [24.20, 69.50], [24.70, 71.00]
        ]
    },
    "Sikkim": {
        "state_code": "SK",
        "name": "Sikkim",
        "center": [27.53, 88.51],
        "default_zoom": 9,
        "bbox": [27.06, 88.01, 28.13, 88.92],
        "districts": [
            "East Sikkim", "West Sikkim", "North Sikkim", "South Sikkim"
        ],
        "boundary_polygon": [
            [28.13, 88.50], [27.80, 88.92], [27.20, 88.80], [27.06, 88.40],
            [27.20, 88.01], [27.80, 88.10], [28.13, 88.50]
        ]
    },
    "Assam": {
        "state_code": "AS",
        "name": "Assam",
        "center": [26.20, 92.93],
        "default_zoom": 7,
        "bbox": [24.13, 89.70, 28.00, 96.02],
        "districts": [
            "Kamrup Metropolitan", "Dhubri", "Dibrugarh", "Silchar", "Jorhat", "Sonitpur", "Cachar"
        ],
        "boundary_polygon": [
            [28.00, 95.50], [27.50, 96.02], [25.50, 94.00], [24.50, 93.00],
            [24.13, 92.50], [25.50, 91.00], [26.00, 89.70], [27.00, 92.00],
            [28.00, 95.50]
        ]
    },
    "West Bengal": {
        "state_code": "WB",
        "name": "West Bengal",
        "center": [23.50, 87.85],
        "default_zoom": 7,
        "bbox": [21.50, 85.80, 27.20, 89.90],
        "districts": [
            "Kolkata", "North 24 Parganas", "South 24 Parganas", "Howrah", "Darjeeling", "Malda", "Murshidabad"
        ],
        "boundary_polygon": [
            [27.20, 88.30], [26.50, 89.90], [24.50, 88.50], [22.00, 89.00],
            [21.50, 88.00], [21.80, 86.80], [23.50, 86.00], [25.00, 87.50],
            [27.20, 88.30]
        ]
    },
    "Odisha": {
        "state_code": "OD",
        "name": "Odisha",
        "center": [20.50, 84.40],
        "default_zoom": 7,
        "bbox": [17.80, 81.38, 22.57, 87.50],
        "districts": [
            "Khurda", "Cuttack", "Puri", "Ganjam", "Balasore", "Kendrapara", "Sambalpur"
        ],
        "boundary_polygon": [
            [22.57, 85.50], [22.00, 87.50], [19.80, 86.20], [18.50, 84.80],
            [17.80, 82.00], [18.80, 81.38], [20.50, 82.50], [22.00, 84.00],
            [22.57, 85.50]
        ]
    },
    "Tamil Nadu": {
        "state_code": "TN",
        "name": "Tamil Nadu",
        "center": [11.12, 78.65],
        "default_zoom": 7,
        "bbox": [8.08, 76.24, 13.56, 80.35],
        "districts": [
            "Chennai", "Coimbatore", "Madurai", "Cuddalore", "Nagapattinam", "Kanyakumari", "Salem"
        ],
        "boundary_polygon": [
            [13.56, 80.20], [12.00, 80.00], [10.50, 79.80], [9.20, 79.20],
            [8.08, 77.55], [8.80, 77.00], [10.50, 76.80], [11.80, 76.24],
            [12.80, 78.00], [13.56, 80.20]
        ]
    },
    "Karnataka": {
        "state_code": "KA",
        "name": "Karnataka",
        "center": [14.50, 75.80],
        "default_zoom": 7,
        "bbox": [11.59, 74.05, 18.45, 78.58],
        "districts": [
            "Bengaluru Urban", "Mysuru", "Dakshina Kannada", "Uttara Kannada", "Belagavi", "Dharwad", "Ballari"
        ],
        "boundary_polygon": [
            [18.45, 77.20], [17.50, 77.80], [15.00, 78.58], [13.00, 78.00],
            [11.59, 76.80], [12.50, 75.00], [14.00, 74.40], [15.50, 74.05],
            [16.80, 75.00], [18.45, 77.20]
        ]
    },
    "Rajasthan": {
        "state_code": "RJ",
        "name": "Rajasthan",
        "center": [26.58, 73.84],
        "default_zoom": 7,
        "bbox": [23.05, 69.50, 30.20, 78.28],
        "districts": [
            "Jaipur", "Jodhpur", "Udaipur", "Bikaner", "Kota", "Ajmer", "Barmer", "Jaisalmer"
        ],
        "boundary_polygon": [
            [30.20, 74.00], [29.50, 76.50], [28.00, 77.50], [26.80, 78.28],
            [24.50, 76.50], [23.50, 74.50], [23.05, 71.50], [25.00, 70.00],
            [27.00, 69.50], [29.00, 72.00], [30.20, 74.00]
        ]
    },
    "Delhi": {
        "state_code": "DL",
        "name": "Delhi",
        "center": [28.61, 77.20],
        "default_zoom": 10,
        "bbox": [28.40, 76.84, 28.88, 77.35],
        "districts": ["New Delhi", "North Delhi", "South Delhi", "East Delhi", "West Delhi"],
        "boundary_polygon": [
            [28.88, 77.10], [28.80, 77.30], [28.60, 77.35], [28.40, 77.20],
            [28.45, 76.90], [28.70, 76.84], [28.88, 77.10]
        ]
    },
    "Jammu and Kashmir": {
        "state_code": "JK",
        "name": "Jammu and Kashmir",
        "center": [33.77, 75.00],
        "default_zoom": 7,
        "bbox": [32.28, 73.76, 35.50, 77.30],
        "districts": ["Srinagar", "Jammu", "Anantnag", "Baramulla", "Pulwama"],
        "boundary_polygon": [
            [35.50, 75.00], [35.00, 76.50], [34.00, 77.30], [32.50, 76.00],
            [32.28, 74.50], [33.50, 73.76], [35.00, 74.20], [35.50, 75.00]
        ]
    },
    "Andaman and Nicobar Islands": {
        "state_code": "AN",
        "name": "Andaman and Nicobar Islands",
        "center": [11.62, 92.73],
        "default_zoom": 7,
        "bbox": [6.75, 92.20, 13.70, 93.95],
        "districts": ["South Andaman", "North and Middle Andaman", "Nicobar"],
        "boundary_polygon": [
            [13.70, 92.80], [13.00, 93.20], [11.00, 93.95], [8.00, 93.80],
            [6.75, 93.50], [7.50, 93.00], [10.50, 92.40], [12.50, 92.20],
            [13.70, 92.80]
        ]
    },
    "Madhya Pradesh": {
        "state_code": "MP",
        "name": "Madhya Pradesh",
        "center": [23.47, 77.94],
        "default_zoom": 7,
        "bbox": [21.08, 74.04, 26.87, 82.81],
        "districts": [
            "Bhopal", "Indore", "Jabalpur", "Gwalior", "Ujjain", "Sagar", 
            "Rewa", "Satna", "Hoshangabad", "Chhindwara", "Dewas", "Ratlam"
        ],
        "boundary_polygon": [
            [26.87, 78.00], [26.50, 79.20], [25.50, 79.50], [25.00, 81.50],
            [24.50, 82.81], [23.50, 82.50], [22.00, 81.00], [21.50, 79.50],
            [21.08, 76.50], [21.50, 74.50], [22.50, 74.04], [24.50, 75.00],
            [25.50, 76.80], [26.87, 78.00]
        ]
    },
    "Chhattisgarh": {
        "state_code": "CG",
        "name": "Chhattisgarh",
        "center": [21.27, 81.86],
        "default_zoom": 7,
        "bbox": [17.78, 80.25, 24.11, 84.40],
        "districts": [
            "Raipur", "Bilaspur", "Durg", "Bastar", "Korba", "Rajnandgaon", 
            "Surguja", "Dantewada", "Janjgir-Champa", "Raigarh"
        ],
        "boundary_polygon": [
            [24.11, 83.20], [23.50, 84.40], [22.00, 83.50], [20.50, 82.50],
            [19.00, 81.50], [17.78, 81.25], [18.50, 80.25], [20.00, 80.80],
            [21.50, 80.90], [22.50, 81.80], [23.80, 82.50], [24.11, 83.20]
        ]
    },
    "Uttar Pradesh": {
        "state_code": "UP",
        "name": "Uttar Pradesh",
        "center": [26.84, 80.94],
        "default_zoom": 7,
        "bbox": [23.87, 77.08, 30.41, 84.64],
        "districts": [
            "Lucknow", "Kanpur", "Varanasi", "Agra", "Prayagraj", "Meerut", 
            "Ghaziabad", "Gorakhpur", "Bareilly", "Aligarh", "Moradabad", "Noida"
        ],
        "boundary_polygon": [
            [30.41, 77.60], [29.80, 78.50], [28.80, 80.20], [27.80, 82.50],
            [27.00, 84.64], [25.50, 84.00], [24.50, 83.20], [23.87, 82.80],
            [24.50, 81.50], [25.50, 79.50], [26.80, 78.50], [27.80, 77.50],
            [28.80, 77.20], [30.00, 77.08], [30.41, 77.60]
        ]
    },
    "Jharkhand": {
        "state_code": "JH",
        "name": "Jharkhand",
        "center": [23.61, 85.27],
        "default_zoom": 7,
        "bbox": [21.97, 83.33, 25.35, 87.95],
        "districts": [
            "Ranchi", "East Singhbhum", "Dhanbad", "Bokaro", "Palamu", 
            "Hazaribagh", "Deoghar", "Giridih", "Ramgarh"
        ],
        "boundary_polygon": [
            [25.35, 87.00], [24.50, 87.95], [23.50, 86.80], [22.50, 86.50],
            [21.97, 85.50], [22.50, 84.20], [23.50, 83.33], [24.50, 83.80],
            [25.00, 85.00], [25.35, 87.00]
        ]
    },
    "Punjab": {
        "state_code": "PB",
        "name": "Punjab",
        "center": [31.14, 75.34],
        "default_zoom": 8,
        "bbox": [29.53, 73.88, 32.50, 76.92],
        "districts": [
            "Amritsar", "Ludhiana", "Jalandhar", "Patiala", "Bathinda", 
            "Gurdaspur", "SAS Nagar", "Hoshiarpur", "Firozpur"
        ],
        "boundary_polygon": [
            [32.50, 75.50], [32.00, 76.00], [31.00, 76.92], [30.00, 76.00],
            [29.53, 75.00], [30.00, 74.00], [31.00, 73.88], [32.00, 74.50],
            [32.50, 75.50]
        ]
    },
    "Haryana": {
        "state_code": "HR",
        "name": "Haryana",
        "center": [29.05, 76.08],
        "default_zoom": 8,
        "bbox": [27.65, 74.46, 30.92, 77.60],
        "districts": [
            "Gurugram", "Faridabad", "Panipat", "Ambala", "Hisar", 
            "Karnal", "Rohtak", "Sonipat", "Panchkula"
        ],
        "boundary_polygon": [
            [30.92, 76.80], [30.50, 77.60], [29.50, 77.20], [28.50, 77.30],
            [27.65, 76.80], [28.20, 75.50], [29.00, 74.80], [30.00, 74.46],
            [30.50, 75.50], [30.92, 76.80]
        ]
    },
    "Goa": {
        "state_code": "GA",
        "name": "Goa",
        "center": [15.29, 74.12],
        "default_zoom": 10,
        "bbox": [14.89, 73.68, 15.80, 74.34],
        "districts": ["North Goa", "South Goa"],
        "boundary_polygon": [
            [15.80, 73.80], [15.70, 74.25], [15.20, 74.34], [14.89, 74.15],
            [15.00, 73.90], [15.40, 73.68], [15.80, 73.80]
        ]
    },
    "Ladakh": {
        "state_code": "LA",
        "name": "Ladakh",
        "center": [34.15, 77.57],
        "default_zoom": 7,
        "bbox": [32.20, 75.50, 36.00, 80.50],
        "districts": ["Leh", "Kargil"],
        "boundary_polygon": [
            [36.00, 77.50], [35.50, 79.50], [34.00, 80.50], [32.50, 79.00],
            [32.20, 77.50], [33.50, 76.00], [34.80, 75.50], [36.00, 77.50]
        ]
    },
    "Arunachal Pradesh": {
        "state_code": "AR",
        "name": "Arunachal Pradesh",
        "center": [28.21, 94.72],
        "default_zoom": 7,
        "bbox": [26.65, 91.50, 29.50, 97.40],
        "districts": [
            "Papum Pare", "Tawang", "West Kameng", "East Siang", 
            "Changlang", "Lohit", "Lower Subansiri"
        ],
        "boundary_polygon": [
            [29.50, 95.00], [28.50, 97.40], [27.50, 96.50], [27.00, 95.50],
            [26.65, 93.50], [27.20, 92.00], [27.80, 91.50], [29.00, 93.50],
            [29.50, 95.00]
        ]
    },
    "Meghalaya": {
        "state_code": "ML",
        "name": "Meghalaya",
        "center": [25.46, 91.36],
        "default_zoom": 8,
        "bbox": [25.03, 89.82, 26.11, 92.83],
        "districts": ["East Khasi Hills", "West Garo Hills", "Ri Bhoi", "West Khasi Hills", "Jaintia Hills"],
        "boundary_polygon": [
            [26.11, 91.50], [25.80, 92.83], [25.10, 92.50], [25.03, 90.50],
            [25.30, 89.82], [26.00, 90.50], [26.11, 91.50]
        ]
    },
    "Manipur": {
        "state_code": "MN",
        "name": "Manipur",
        "center": [24.66, 93.90],
        "default_zoom": 8,
        "bbox": [23.83, 93.03, 25.68, 94.78],
        "districts": ["Imphal East", "Imphal West", "Churachandpur", "Thoubal", "Bishnupur"],
        "boundary_polygon": [
            [25.68, 94.20], [25.00, 94.78], [24.00, 94.40], [23.83, 93.30],
            [24.50, 93.03], [25.20, 93.50], [25.68, 94.20]
        ]
    },
    "Nagaland": {
        "state_code": "NL",
        "name": "Nagaland",
        "center": [26.15, 94.56],
        "default_zoom": 8,
        "bbox": [25.20, 93.33, 27.04, 95.25],
        "districts": ["Kohima", "Dimapur", "Mokokchung", "Tuensang", "Wokha", "Mon"],
        "boundary_polygon": [
            [27.04, 95.10], [26.50, 95.25], [25.50, 94.50], [25.20, 93.50],
            [25.80, 93.33], [26.50, 94.20], [27.04, 95.10]
        ]
    },
    "Mizoram": {
        "state_code": "MZ",
        "name": "Mizoram",
        "center": [23.16, 92.93],
        "default_zoom": 8,
        "bbox": [21.95, 92.25, 24.52, 93.43],
        "districts": ["Aizawl", "Lunglei", "Champhai", "Kolasib", "Serchhip"],
        "boundary_polygon": [
            [24.52, 93.00], [24.00, 93.43], [22.80, 93.20], [21.95, 92.80],
            [22.50, 92.25], [23.80, 92.50], [24.52, 93.00]
        ]
    },
    "Tripura": {
        "state_code": "TR",
        "name": "Tripura",
        "center": [23.94, 91.98],
        "default_zoom": 9,
        "bbox": [22.93, 91.15, 24.53, 92.34],
        "districts": ["West Tripura", "Gomati", "South Tripura", "North Tripura", "Dhalai"],
        "boundary_polygon": [
            [24.53, 92.15], [24.00, 92.34], [23.00, 91.90], [22.93, 91.40],
            [23.50, 91.15], [24.20, 91.50], [24.53, 92.15]
        ]
    },
    "Chandigarh": {
        "state_code": "CH",
        "name": "Chandigarh",
        "center": [30.73, 76.77],
        "default_zoom": 11,
        "bbox": [30.68, 76.72, 30.79, 76.84],
        "districts": ["Chandigarh"],
        "boundary_polygon": [
            [30.79, 76.75], [30.76, 76.84], [30.68, 76.80], [30.70, 76.72], [30.79, 76.75]
        ]
    },
    "Puducherry": {
        "state_code": "PY",
        "name": "Puducherry",
        "center": [11.94, 79.80],
        "default_zoom": 10,
        "bbox": [11.85, 79.72, 12.05, 79.88],
        "districts": ["Puducherry", "Karaikal", "Mahe", "Yanam"],
        "boundary_polygon": [
            [12.05, 79.80], [11.98, 79.88], [11.85, 79.82], [11.90, 79.72], [12.05, 79.80]
        ]
    },
    "Dadra and Nagar Haveli and Daman and Diu": {
        "state_code": "DNHDD",
        "name": "Dadra and Nagar Haveli and Daman and Diu",
        "center": [20.42, 72.83],
        "default_zoom": 9,
        "bbox": [20.00, 72.80, 20.75, 73.15],
        "districts": ["Daman", "Diu", "Dadra and Nagar Haveli"],
        "boundary_polygon": [
            [20.75, 72.90], [20.45, 73.15], [20.00, 73.05], [20.20, 72.80], [20.75, 72.90]
        ]
    },
    "Lakshadweep": {
        "state_code": "LD",
        "name": "Lakshadweep",
        "center": [10.56, 72.64],
        "default_zoom": 8,
        "bbox": [8.20, 71.50, 12.50, 74.00],
        "districts": ["Lakshadweep"],
        "boundary_polygon": [
            [12.50, 72.00], [11.00, 73.50], [9.00, 74.00], [8.20, 73.00],
            [9.50, 71.80], [11.50, 71.50], [12.50, 72.00]
        ]
    }
}

INDIA_CENTER = [22.9734, 78.6569]
INDIA_DEFAULT_ZOOM = 5
INDIA_BBOX = [6.0, 68.0, 37.5, 97.5]

def get_all_supported_states() -> List[Dict[str, Any]]:
    """Returns metadata summary for all configured Indian States/UTs."""
    states_list = []
    for state_name, data in INDIAN_STATES_DATA.items():
        states_list.append({
            "name": state_name,
            "state_code": data["state_code"],
            "center": data["center"],
            "default_zoom": data["default_zoom"],
            "bbox": data["bbox"],
            "districts": data["districts"]
        })
    return sorted(states_list, key=lambda s: s["name"])

def get_state_boundaries_geojson() -> Dict[str, Any]:
    """Builds a valid GeoJSON FeatureCollection of official state boundary polygons and multipolygons."""
    features = []
    for state_name, data in INDIAN_STATES_DATA.items():
        if "boundary_multipolygon" in data:
            multi_coords = []
            for poly in data["boundary_multipolygon"]:
                ring = [[pt[1], pt[0]] for pt in poly]
                if ring and ring[0] != ring[-1]:
                    ring.append(ring[0])
                multi_coords.append([ring])
            geom_type = "MultiPolygon"
            coordinates = multi_coords
        else:
            # GeoJSON coordinates are in [longitude, latitude]
            ring = [[pt[1], pt[0]] for pt in data.get("boundary_polygon", [])]
            if ring and ring[0] != ring[-1]:
                ring.append(ring[0]) # Close polygon ring
            geom_type = "Polygon"
            coordinates = [ring]

        features.append({
            "type": "Feature",
            "properties": {
                "name": state_name,
                "state_name": state_name,
                "state_code": data["state_code"],
                "center": data["center"],
                "default_zoom": data["default_zoom"],
                "districts_count": len(data.get("districts", [])),
                "districts": data.get("districts", [])
            },
            "geometry": {
                "type": geom_type,
                "coordinates": coordinates
            }
        })

    return {
        "type": "FeatureCollection",
        "features": features
    }
