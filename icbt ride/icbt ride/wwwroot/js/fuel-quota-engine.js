/**
 * ICBT Ride - Fuel Quota & Odd-Even Plate Restriction Engine
 * Manages vehicle quota tracking, plate compliance, and fuel consumption formulas.
 */

export const FUEL_CONFIG = {
    DEFAULT_MONTHLY_QUOTA: 30.0,      // Liters per month per vehicle
    FUEL_CONSUMPTION_PER_KM: 0.08,    // 0.08 Liters per KM (12.5 km/L avg)
    FUEL_PRICE_PER_LITER: 320.0,      // LKR 320 per Liter (Octane 92 / Standard)
    LOW_QUOTA_THRESHOLD_PERCENT: 20.0 // Low quota warning threshold (< 20%)
};

// Sri Lankan Route Estimated Distances (KM)
const KNOWN_SRI_LANKAN_DISTANCES = {
    "kandy-colombo": 115.0,
    "colombo-kandy": 115.0,
    "matale-kandy": 25.0,
    "kandy-matale": 25.0,
    "matale-icbt": 25.0,
    "icbt-matale": 25.0,
    "matale-icbt kandy": 25.0,
    "icbt kandy-matale": 25.0,
    "digana-kandy": 16.0,
    "kandy-digana": 16.0,
    "digana-icbt": 16.0,
    "icbt-digana": 16.0,
    "digana-icbt kandy": 16.0,
    "icbt kandy-digana": 16.0,
    "menikhinna-kandy": 10.0,
    "kandy-menikhinna": 10.0,
    "menikhinna-icbt": 10.0,
    "icbt-menikhinna": 10.0,
    "teldeniya-kandy": 22.0,
    "kandy-teldeniya": 22.0,
    "teldeniya-icbt": 22.0,
    "icbt-teldeniya": 22.0,
    "gampola-kandy": 18.0,
    "kandy-gampola": 18.0,
    "gampola-icbt": 18.5,
    "icbt-gampola": 18.5,
    "gampola-icbt kandy": 18.5,
    "icbt kandy-gampola": 18.5,
    "peradeniya-kandy": 6.0,
    "kandy-peradeniya": 6.0,
    "peradeniya-icbt": 6.5,
    "icbt-peradeniya": 6.5,
    "peradeniya-icbt kandy": 6.5,
    "icbt kandy-peradeniya": 6.5,
    "gampola-peradeniya": 12.0,
    "peradeniya-gampola": 12.0,
    "gelioya-kandy": 14.0,
    "kandy-gelioya": 14.0,
    "katugastota-kandy": 4.0,
    "kandy-katugastota": 4.0,
    "negombo-colombo": 38.0,
    "colombo-negombo": 38.0,
    "gampaha-colombo": 30.0,
    "colombo-gampaha": 30.0,
    "nugegoda-icbt": 8.5,
    "icbt-nugegoda": 8.5,
    "maharagama-icbt": 12.0,
    "icbt-maharagama": 12.0,
    "malabe-icbt": 14.0,
    "icbt-malabe": 14.0,
    "kadawatha-icbt": 18.0,
    "icbt-kadawatha": 18.0,
    "panadura-icbt": 28.0,
    "icbt-panadura": 28.0,
    "kandy-icbt": 118.0,
    "icbt-kandy": 118.0,
    "negombo-icbt": 39.0,
    "icbt-negombo": 39.0,
    "gampaha-icbt": 32.0,
    "icbt-gampaha": 32.0,
    "colombo 03-mount lavinia": 12.0,
    "mount lavinia-colombo 03": 12.0,
    "homagama-icbt": 22.0,
    "icbt-homagama": 22.0
};

export class FuelQuotaEngine {
    
    /**
     * Extracts the last numerical digit from a vehicle number plate.
     * Examples:
     *  - "WP CAB-4521" -> 1
     *  - "ABC-1234"    -> 4
     *  - "65-4328"     -> 8
     *  - "CAA 9988"    -> 8
     */
    static extractLastDigit(plateNumber) {
        if (!plateNumber) return 0;
        const cleaned = plateNumber.toString().trim();
        const digits = cleaned.match(/\d/g);
        if (!digits || digits.length === 0) return 0;
        return parseInt(digits[digits.length - 1], 10);
    }

    /**
     * Determines whether a plate is ODD or EVEN.
     * @returns {'ODD' | 'EVEN'}
     */
    static getPlateType(plateNumber) {
        const lastDigit = this.extractLastDigit(plateNumber);
        return (lastDigit % 2 === 0) ? 'EVEN' : 'ODD';
    }

    /**
     * Determines whether a given date is ODD or EVEN based on day-of-month.
     * @param {string|Date} dateInput
     * @returns {'ODD' | 'EVEN'}
     */
    static getDateType(dateInput) {
        let dayOfMonth;
        if (!dateInput) {
            dayOfMonth = new Date().getDate();
        } else if (typeof dateInput === 'string') {
            // Check if string contains YYYY-MM-DD
            const parts = dateInput.split('T')[0].split('-');
            if (parts.length === 3) {
                dayOfMonth = parseInt(parts[2], 10);
            } else {
                dayOfMonth = new Date(dateInput).getDate();
            }
        } else if (dateInput instanceof Date) {
            dayOfMonth = dateInput.getDate();
        } else {
            dayOfMonth = new Date().getDate();
        }
        return (dayOfMonth % 2 === 0) ? 'EVEN' : 'ODD';
    }

    /**
     * Check if vehicle is eligible to refuel / operate on a given date.
     */
    static checkEligibility(plateNumber, dateInput = new Date()) {
        const plateType = this.getPlateType(plateNumber);
        const dateType = this.getDateType(dateInput);
        const lastDigit = this.extractLastDigit(plateNumber);
        const isEligible = (plateType === dateType);

        let dateNum = new Date().getDate();
        if (typeof dateInput === 'string' && dateInput.includes('-')) {
            dateNum = parseInt(dateInput.split('T')[0].split('-')[2], 10) || dateNum;
        }

        const messageEn = isEligible 
            ? `Vehicle ${plateNumber} (ends with ${lastDigit} - ${plateType}) matches today's ${dateType} date (Day ${dateNum}). Refueling & rides ALLOWED.`
            : `Vehicle ${plateNumber} (ends with ${lastDigit} - ${plateType}) can ONLY refuel/operate on ${plateType} calendar dates. Blocked on ${dateType} dates.`;

        const messageSi = isEligible
            ? `Vehicle ${plateNumber} (ends with ${lastDigit} - ${plateType}) matches today's ${dateType} date. Refueling & rides ALLOWED.`
            : `Vehicle ${plateNumber} (${plateType}) can ONLY refuel/operate on ${plateType} calendar dates. Blocked today.`;

        return {
            eligible: isEligible,
            lastDigit,
            plateType,
            dateType,
            dateNumber: dateNum,
            messageEn,
            messageSi
        };
    }

    /**
     * Estimates distance in KM between two locations in Sri Lanka.
     */
    static estimateDistance(origin = '', destination = '') {
        const key1 = `${origin.toLowerCase().trim()}-${destination.toLowerCase().trim()}`;
        const key2 = `${destination.toLowerCase().trim()}-${origin.toLowerCase().trim()}`;

        for (const [route, km] of Object.entries(KNOWN_SRI_LANKAN_DISTANCES)) {
            if (key1.includes(route) || key2.includes(route)) {
                return km;
            }
        }

        // Fuzzy match common Sri Lankan hubs
        const o = origin.toLowerCase();
        const d = destination.toLowerCase();

        if ((o.includes('kandy') && d.includes('colombo')) || (o.includes('colombo') && d.includes('kandy'))) return 115.0;
        if ((o.includes('negombo') && d.includes('colombo')) || (o.includes('colombo') && d.includes('negombo'))) return 38.0;
        if ((o.includes('gampaha') && d.includes('colombo')) || (o.includes('colombo') && d.includes('gampaha'))) return 30.0;
        if ((o.includes('galle') && d.includes('colombo')) || (o.includes('colombo') && d.includes('galle'))) return 120.0;
        if ((o.includes('kurunegala') && d.includes('colombo')) || (o.includes('colombo') && d.includes('kurunegala'))) return 94.0;
        if ((o.includes('kalutara') && d.includes('colombo')) || (o.includes('colombo') && d.includes('kalutara'))) return 42.0;

        // Default local city ride distance
        return 15.0;
    }

    /**
     * Calculates fuel consumption in Liters for a distance.
     * Fuel = Distance (KM) * 0.08 L/KM
     */
    static calculateFuelNeeded(distanceKm, consumptionRate = FUEL_CONFIG.FUEL_CONSUMPTION_PER_KM) {
        const rate = parseFloat(consumptionRate) || FUEL_CONFIG.FUEL_CONSUMPTION_PER_KM;
        return parseFloat((distanceKm * rate).toFixed(2));
    }

    /**
     * Calculates estimated fuel cost in LKR.
     * Cost = Liters * LKR 320
     */
    static calculateFuelCost(fuelLiters, pricePerLiter = FUEL_CONFIG.FUEL_PRICE_PER_LITER) {
        const price = parseFloat(pricePerLiter) || FUEL_CONFIG.FUEL_PRICE_PER_LITER;
        return Math.round(fuelLiters * price);
    }

    /**
     * Calculates dynamic passenger fare based on exact travel distance in KM (Rs. 25/KM with Rs. 100 min fare).
     */
    static calculatePassengerFare(distanceKm, ratePerKm = 25) {
        const d = Math.max(1, parseFloat(distanceKm) || 10);
        const calculated = Math.max(100, Math.round((d * ratePerKm) / 10) * 10);
        return calculated;
    }

    /**
     * Checks if a vehicle's monthly quota requires automatic reset on the 1st of month.
     */
    static checkAndResetMonthlyQuota(vehicle) {
        const currentMonth = new Date().toISOString().substring(0, 7); // e.g. "2026-08"
        const maxQuota = parseFloat(vehicle.monthlyQuota) || FUEL_CONFIG.DEFAULT_MONTHLY_QUOTA;
        let remainingQuota = parseFloat(vehicle.remainingQuota !== undefined ? vehicle.remainingQuota : maxQuota);
        let fuelUsedThisMonth = parseFloat(vehicle.fuelUsedThisMonth || 0.0);
        let wasReset = false;

        if (!vehicle.lastQuotaMonth || vehicle.lastQuotaMonth !== currentMonth) {
            remainingQuota = maxQuota;
            fuelUsedThisMonth = 0.0;
            wasReset = true;
        }

        return {
            currentMonth,
            maxQuota,
            remainingQuota,
            fuelUsedThisMonth,
            wasReset
        };
    }

    /**
     * Validates ride creation against Odd-Even date restriction and Fuel Quota.
     */
    static validateRideCreation({ vehicle, date, origin, destination, distanceKm: customDist }) {
        const plate = vehicle.plateNumber || vehicle.plate || '';
        const maxQuota = parseFloat(vehicle.monthlyQuota) || FUEL_CONFIG.DEFAULT_MONTHLY_QUOTA;
        const remainingQuota = parseFloat(vehicle.remainingQuota !== undefined ? vehicle.remainingQuota : maxQuota);
        
        // 1. Check Odd-Even restriction
        const eligibility = this.checkEligibility(plate, date);

        // 2. Calculate Distance & Fuel Needed
        const distanceKm = customDist ? parseFloat(customDist) : this.estimateDistance(origin, destination);
        const fuelNeeded = this.calculateFuelNeeded(distanceKm, vehicle.fuelConsumptionRate || FUEL_CONFIG.FUEL_CONSUMPTION_PER_KM);
        const fuelCostLkr = this.calculateFuelCost(fuelNeeded);

        // Quota check (Drivers can operate/drive on ANY day as long as fuel quota is sufficient)
        const quotaPassed = remainingQuota >= fuelNeeded;
        const afterRideQuota = parseFloat(Math.max(0, remainingQuota - fuelNeeded).toFixed(2));
        const quotaPercentage = Math.round((remainingQuota / maxQuota) * 100);
        const isLowQuota = quotaPercentage <= FUEL_CONFIG.LOW_QUOTA_THRESHOLD_PERCENT;

        // Driving is allowed on any date; Odd/Even rule only restricts shed refueling
        const allValid = quotaPassed;

        let errorEn = '';
        let errorSi = '';

        if (!quotaPassed) {
            errorEn = `Insufficient Fuel Quota: This ride requires ${fuelNeeded} L, but your vehicle only has ${remainingQuota} L remaining.`;
            errorSi = `Insufficient Fuel Quota: This ride requires ${fuelNeeded} L, but your vehicle only has ${remainingQuota} L remaining.`;
        }

        return {
            isValid: allValid,
            plateNumber: plate,
            plateType: eligibility.plateType,
            dateType: eligibility.dateType,
            dateNumber: eligibility.dateNumber,
            dateCheckPassed: eligibility.eligible,
            quotaCheckPassed: quotaPassed,
            distanceKm,
            fuelNeeded,
            fuelCostLkr,
            currentQuota: remainingQuota,
            maxQuota,
            afterRideQuota,
            quotaPercentage,
            isLowQuota,
            errorEn,
            errorSi,
            eligibility
        };
    }
}

// Attach to window object for global script usage
if (typeof window !== 'undefined') {
    window.FuelQuotaEngine = FuelQuotaEngine;
    window.FUEL_CONFIG = FUEL_CONFIG;
}

