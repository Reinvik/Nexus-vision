export const CAR_BRANDS = [
    "Toyota", "Hyundai", "Kia", "Chevrolet", "Suzuki", "Nissan", "Ford", "Peugeot", "Mitsubishi", 
    "Volkswagen", "Mazda", "MG", "Chery", "Great Wall", "Haval", "Changan", "JAC", "Maxus", 
    "Subaru", "Renault", "Citroën", "Jeep", "Ram", "SsangYong", "BMW", "Audi", "Mercedes-Benz", 
    "Volvo", "Geely", "Jetour", "Honda", "Fiat", "Land Rover", "Mahindra"
];

export const COMMON_CC = ["1.0", "1.2", "1.4", "1.5", "1.6", "1.8", "2.0", "2.2", "2.4", "2.5", "3.0", "3.5"];
export const COMMON_YEARS = Array.from({ length: 16 }, (_, i) => (2025 - i).toString());

export const CAR_MODELS: Record<string, string[]> = {
    "Toyota": ["Yaris", "Hilux", "Corolla", "RAV4", "4Runner", "Fortuner", "Prado", "Land Cruiser", "Rush", "Raize", "Corolla Cross", "Urban Cruiser", "Hiace", "Camry", "Prius"],
    "Hyundai": ["Accent", "Grand i10", "Tucson", "Santa Fe", "Elantra", "Creta", "Venue", "Kona", "Palisade", "Staria", "H-1", "Ioniq 5"],
    "Kia": ["Morning", "Rio", "Soluto", "Cerato", "Sportage", "Sorento", "Seltos", "Sonet", "Carnival", "Niro", "Frontier", "EV6"],
    "Chevrolet": ["Sail", "Onix", "Groove", "Tracker", "Captiva", "Silverado", "Colorado", "Cavalier", "Tahoe", "Suburban", "N400", "Spin", "Trax", "Cruze", "Equinox"],
    "Suzuki": ["Swift", "Baleno", "Dzire", "S-Presso", "Vitara", "Jimny", "Ertiga", "XL7", "Ignis", "Alto", "Grand Vitara", "S-Cross"],
    "Nissan": ["Versa", "Sentra", "Kicks", "Navara", "Frontier", "Qashqai", "X-Trail", "Pathfinder", "March", "Urvan", "Leaf"],
    "Ford": ["Ranger", "F-150", "Territory", "Explorer", "Maverick", "Bronco Sport", "Bronco", "Transit", "Expedition", "Mustang"],
    "Peugeot": ["208", "2008", "3008", "5008", "301", "Partner", "Expert", "Boxer", "Landtrek", "308"],
    "Mitsubishi": ["L200", "Montero Sport", "Outlander", "ASX", "Eclipse Cross", "Mirage", "Montero"],
    "Volkswagen": ["Gol", "Polo", "Virtus", "T-Cross", "Nivus", "Taos", "Tiguan", "Amarok", "Saveiro", "Voyage", "Vento", "Jetta"],
    "Mazda": ["Mazda 2", "Mazda 3", "CX-3", "CX-30", "CX-5", "CX-9", "CX-60", "BT-50", "Mazda 6"],
    "MG": ["MG3", "MG ZS", "MG ZX", "MG HS", "MG 5", "MG GT", "MG RX5", "MG4"],
    "Chery": ["Tiggo 2", "Tiggo 3", "Tiggo 7", "Tiggo 8", "Tiggo 2 Pro", "Tiggo 7 Pro", "Tiggo 8 Pro"],
    "Great Wall": ["Poer", "Wingle 5", "Wingle 7", "M4"],
    "Haval": ["H6", "Jolion", "Dargo", "H6 GT"],
    "Changan": ["Alsvin", "CS15", "CS35 Plus", "CS55 Plus", "UNI-T", "UNI-K", "Hunter"],
    "JAC": ["JS2", "JS3", "JS4", "JS6", "JS8", "T6", "T8"],
    "Maxus": ["T60", "T90", "EV30", "V80", "G10", "D60", "D90"],
    "Subaru": ["XV", "Forester", "Outback", "Impreza", "WRX", "Evoltis", "Crosstrek"],
    "Renault": ["Kwid", "Duster", "Stepway", "Logan", "Koleos", "Oroch", "Master", "Captur"],
    "Citroën": ["C3", "C4 Cactus", "C5 Aircross", "Berlingo", "Jumpy", "C4"],
    "Jeep": ["Renegade", "Compass", "Commander", "Grand Cherokee", "Wrangler", "Gladiator"],
    "Ram": ["700", "1000", "1500", "2500"],
    "SsangYong": ["Tivoli", "Korando", "Rexton", "Musso", "Musso Grand"],
    "BMW": ["X1", "X3", "X5", "Serie 1", "Serie 3", "Serie 5"],
    "Audi": ["A1", "A3", "A4", "Q2", "Q3", "Q5"],
    "Mercedes-Benz": ["Clase A", "Clase C", "GLA", "GLC", "GLE", "Sprinter"],
    "Volvo": ["XC40", "XC60", "XC90", "V40"],
    "Geely": ["Coolray", "Azkarra", "Geometry C"],
    "Jetour": ["X70", "X70 Plus", "Dashing"],
    "Honda": ["Civic", "HR-V", "CR-V", "WR-V", "City", "Fit"],
    "Fiat": ["Fiorino", "Cronos", "Pulse", "Toro", "Mobi"],
    "Land Rover": ["Range Rover Evoque", "Discovery", "Defender"],
    "Mahindra": ["XUV500", "Scorpio", "Pik Up"]
};
