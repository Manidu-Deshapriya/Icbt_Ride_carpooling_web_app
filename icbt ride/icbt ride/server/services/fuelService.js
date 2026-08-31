/**
 * ==============================================================================
 * ICBT Ride - Fuel Quota & Odd-Even Business Logic Service
 * Sri Lanka National Fuel Crisis Regulatory Engine (Backend Implementation)
 * ==============================================================================
 */

const FUEL_CONFIG = {
  DEFAULT_MONTHLY_QUOTA: 30.0,      // 30 Liters per month
  FUEL_CONSUMPTION_PER_KM: 0.08,    // 0.08 Liters per KM (12.5 km/L)
  FUEL_PRICE_PER_LITER: 320.0,      // Regulated price LKR 320/L
  LOW_QUOTA_THRESHOLD_PERCENT: 20.0 // Low quota alert threshold
};

class FuelService {
  /**
   * Extract the last numeric digit from a vehicle registration plate.
   * e.g., "WP CAB-4521" -> 1, "CAA-9988" -> 8, "65-4328" -> 8
   */
  static extractLastDigit(plateNumber) {
    if (!plateNumber) return 0;
    const digits = plateNumber.toString().match(/\d/g);
    if (!digits || digits.length === 0) return 0;
    return parseInt(digits[digits.length - 1], 10);
  }

  /**
   * Check whether a plate is Odd or Even.
   * Returns 'ODD' or 'EVEN'
   */
  static getPlateType(plateNumber) {
    const lastDigit = this.extractLastDigit(plateNumber);
    return (lastDigit % 2 !== 0) ? 'ODD' : 'EVEN';
  }

  /**
   * Check if a vehicle is eligible on a given calendar date under Odd-Even rule.
   * @param {string} plateNumber 
   * @param {Date|string} dateStr (YYYY-MM-DD or Date object)
   */
  static isOddEvenEligible(plateNumber, dateStr = new Date()) {
    const dateObj = new Date(dateStr);
    const dayOfMonth = dateObj.getDate();
    const isDateOdd = (dayOfMonth % 2 !== 0);
    const plateType = this.getPlateType(plateNumber);
    const isPlateOdd = (plateType === 'ODD');

    const eligible = (isDateOdd === isPlateOdd);
    return {
      eligible,
      plateNumber,
      lastDigit: this.extractLastDigit(plateNumber),
      plateType,
      dayOfMonth,
      dateOddEven: isDateOdd ? 'ODD' : 'EVEN',
      reason: eligible
        ? `Eligible: Last digit (${this.extractLastDigit(plateNumber)} - ${plateType}) matches date (${dayOfMonth} - ${isDateOdd ? 'ODD' : 'EVEN'}).`
        : `Restricted: License plate ends in ${this.extractLastDigit(plateNumber)} (${plateType}) but ride date is ${dayOfMonth} (${isDateOdd ? 'ODD' : 'EVEN'}). Sri Lanka Odd-Even rule applies.`
    };
  }

  /**
   * Calculate required fuel for a trip.
   * @param {number} distanceKm
   */
  static calculateFuelConsumption(distanceKm) {
    const dist = parseFloat(distanceKm) || 0;
    const fuelLiters = dist * FUEL_CONFIG.FUEL_CONSUMPTION_PER_KM;
    const estimatedCost = fuelLiters * FUEL_CONFIG.FUEL_PRICE_PER_LITER;

    return {
      distanceKm: dist,
      fuelLiters: parseFloat(fuelLiters.toFixed(2)),
      estimatedCostLkr: parseFloat(estimatedCost.toFixed(2)),
      consumptionRate: `${FUEL_CONFIG.FUEL_CONSUMPTION_PER_KM} L/km`
    };
  }

  /**
   * Validate if a ride can be published or conducted given vehicle quota & Odd-Even date.
   */
  static validateRideCreation(plateNumber, rideDate, estimatedDistanceKm, currentQuota = 30.0) {
    const oddEvenCheck = this.isOddEvenEligible(plateNumber, rideDate);
    const fuelCalc = this.calculateFuelConsumption(estimatedDistanceKm);

    if (!oddEvenCheck.eligible) {
      return {
        isValid: false,
        code: 'ODD_EVEN_VIOLATION',
        error: oddEvenCheck.reason,
        details: oddEvenCheck
      };
    }

    if (currentQuota < fuelCalc.fuelLiters) {
      return {
        isValid: false,
        code: 'INSUFFICIENT_FUEL_QUOTA',
        error: `Insufficient fuel quota. Required: ${fuelCalc.fuelLiters}L, Available: ${currentQuota}L.`,
        details: { required: fuelCalc.fuelLiters, available: currentQuota }
      };
    }

    return {
      isValid: true,
      oddEven: oddEvenCheck,
      fuelRequirement: fuelCalc,
      remainingQuotaAfterRide: parseFloat((currentQuota - fuelCalc.fuelLiters).toFixed(2))
    };
  }

  /**
   * Validate refuel transaction
   */
  static validateRefuel(plateNumber, refuelDate, litersToAdd, currentQuota = 0.0) {
    const oddEvenCheck = this.isOddEvenEligible(plateNumber, refuelDate);
    const liters = parseFloat(litersToAdd) || 0;

    if (!oddEvenCheck.eligible) {
      return {
        isValid: false,
        code: 'ODD_EVEN_REFUEL_RESTRICTED',
        error: `Refueling not allowed today. ${oddEvenCheck.reason}`
      };
    }

    const newQuota = currentQuota + liters;
    if (newQuota > FUEL_CONFIG.DEFAULT_MONTHLY_QUOTA) {
      return {
        isValid: false,
        code: 'QUOTA_LIMIT_EXCEEDED',
        error: `Cannot exceed monthly quota limit of ${FUEL_CONFIG.DEFAULT_MONTHLY_QUOTA}L. Max refuel allowed: ${(FUEL_CONFIG.DEFAULT_MONTHLY_QUOTA - currentQuota).toFixed(2)}L.`
      };
    }

    return {
      isValid: true,
      litersAdded: liters,
      newQuota: parseFloat(newQuota.toFixed(2)),
      totalCostLkr: parseFloat((liters * FUEL_CONFIG.FUEL_PRICE_PER_LITER).toFixed(2))
    };
  }
}

module.exports = {
  FUEL_CONFIG,
  FuelService
};
