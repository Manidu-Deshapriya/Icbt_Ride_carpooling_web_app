/**
 * ==============================================================================
 * ICBT Ride - Ride Earnings & Revenue Split Service
 * Calculates Driver & Fleet Owner Earnings distribution
 * ==============================================================================
 */

class EarningsService {
  /**
   * Calculate revenue split for a ride.
   * @param {number} totalFareLkr - Total fare paid by passengers
   * @param {boolean} isOwnerDriver - True if driver owns the vehicle
   * @param {number} customOwnerPercentage - Default 70% if hired
   */
  static calculateSplit(totalFareLkr, isOwnerDriver = true, customOwnerPercentage = 70) {
    const fare = parseFloat(totalFareLkr) || 0;

    if (isOwnerDriver) {
      // Driver owns the vehicle -> 100% earnings to driver
      return {
        totalFareLkr: fare,
        isOwnerDriver: true,
        driverShareLkr: fare,
        driverPercentage: 100,
        ownerShareLkr: 0,
        ownerPercentage: 0,
        platformFeeLkr: 0
      };
    }

    // Vehicle belongs to an Owner and Driver is hired (Default: 70% Owner, 30% Driver)
    const ownerPct = parseFloat(customOwnerPercentage) || 70;
    const driverPct = 100 - ownerPct;

    const ownerShare = parseFloat(((fare * ownerPct) / 100).toFixed(2));
    const driverShare = parseFloat((fare - ownerShare).toFixed(2));

    return {
      totalFareLkr: fare,
      isOwnerDriver: false,
      driverShareLkr: driverShare,
      driverPercentage: driverPct,
      ownerShareLkr: ownerShare,
      ownerPercentage: ownerPct,
      platformFeeLkr: 0
    };
  }
}

module.exports = {
  EarningsService
};
