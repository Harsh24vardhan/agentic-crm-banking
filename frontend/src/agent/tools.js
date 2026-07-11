import { mockCustomers, mockTransactions } from "./mockDatabase.js";

/**
 * Filter and search for customers in the CRM database.
 * @param {Object} filters
 * @param {number} [filters.minBalance] - Minimum total balance
 * @param {number} [filters.minCreditScore] - Minimum credit score
 * @param {number} [filters.minIncome] - Minimum annual income
 * @param {string} [filters.segment] - Customer segment ("Standard", "High Value", "Ultra HNW")
 * @param {string} [filters.occupation] - Occupation search term
 */
export function get_customers(filters = {}) {
  let results = [...mockCustomers];

  if (filters.minBalance !== undefined) {
    results = results.filter(c => c.totalBalance >= filters.minBalance);
  }
  if (filters.minCreditScore !== undefined) {
    results = results.filter(c => c.creditScore >= filters.minCreditScore);
  }
  if (filters.minIncome !== undefined) {
    results = results.filter(c => c.annualIncome >= filters.minIncome);
  }
  if (filters.segment !== undefined && filters.segment !== "") {
    results = results.filter(c => c.segment.toLowerCase() === filters.segment.toLowerCase());
  }
  if (filters.riskProfile !== undefined && filters.riskProfile !== "") {
    results = results.filter(c => c.riskProfile.toLowerCase() === filters.riskProfile.toLowerCase());
  }
  if (filters.occupation !== undefined && filters.occupation !== "") {
    results = results.filter(c => c.occupation.toLowerCase().includes(filters.occupation.toLowerCase()));
  }
  if (filters.name !== undefined && filters.name !== "") {
    results = results.filter(c => c.name.toLowerCase().includes(filters.name.toLowerCase()));
  }

  return {
    success: true,
    count: results.length,
    data: results
  };
}

/**
 * Retrieve transaction history for a specific customer.
 * @param {string} customerId
 */
export function get_customer_transactions(customerId) {
  const transactions = mockTransactions.filter(t => t.customerId === customerId);
  const customer = mockCustomers.find(c => c.id === customerId);

  if (!customer) {
    return { success: false, error: `Customer with ID ${customerId} not found.` };
  }

  return {
    success: true,
    customerId,
    customerName: customer.name,
    count: transactions.length,
    data: transactions
  };
}

/**
 * Heuristically estimate likelihood of conversion for a specific product.
 * @param {string} customerId
 * @param {string} productType - "Personal Loan" | "Travel Elite Credit Card" | "Wealth Advisory"
 */
export function calculate_conversion_probability(customerId, productType) {
  const customer = mockCustomers.find(c => c.id === customerId);
  if (!customer) {
    return { success: false, error: `Customer with ID ${customerId} not found.` };
  }

  const transactions = mockTransactions.filter(t => t.customerId === customerId);
  
  let score = 0;
  let factors = [];
  let recommendations = [];

  const annualIncome = customer.annualIncome;
  const creditScore = customer.creditScore;
  const totalBalance = customer.totalBalance;
  const activeProducts = customer.activeProducts;
  const notes = customer.notes.toLowerCase();

  if (productType === "Personal Loan") {
    // Income Factors
    if (annualIncome > 120000) {
      score += 25;
      factors.push("High income ($" + annualIncome.toLocaleString() + ") increases debt serviceability (+25%)");
    } else if (annualIncome > 80000) {
      score += 15;
      factors.push("Healthy income ($" + annualIncome.toLocaleString() + ") supports repayment capacity (+15%)");
    } else if (annualIncome < 40000) {
      score -= 20;
      factors.push("Low income levels reduce borrow capability (-20%)");
    }

    // Credit Score Factors
    if (creditScore >= 750) {
      score += 25;
      factors.push("Excellent credit score (" + creditScore + ") indicates low default risk (+25%)");
    } else if (creditScore >= 680) {
      score += 15;
      factors.push("Good credit standing (" + creditScore + ") (+15%)");
    } else {
      score -= 30;
      factors.push("Sub-prime credit score (" + creditScore + ") lowers debt suitability (-30%)");
    }

    // Notes Context
    if (notes.includes("expansion") || notes.includes("financing") || notes.includes("liquidity") || notes.includes("loan for property")) {
      score += 30;
      factors.push("Explicit interest in financing/liquidity noted in profile notes (+30%)");
    }
    if (notes.includes("expiring next month") || notes.includes("active personal loan expiring")) {
      score += 35;
      factors.push("Current personal loan is expiring; high likelihood of refinance/top-up (+35%)");
    }
    if (notes.includes("unlikely to take additional debt")) {
      score -= 40;
      factors.push("Expressed reluctance to take on new debts in profile (-40%)");
    }

    // Balance factors
    if (totalBalance > 100000) {
      score += 10;
      factors.push("High liquidity suggests strong asset backing (+10%)");
    }

    // Cap score at 98% and min at 5%
    score = Math.max(5, Math.min(98, score));

    recommendations.push("Pitch preferred interest rate starting at 5.9% APR.");
    if (notes.includes("dental")) {
      recommendations.push("Position as an 'Office/Equipment Expansion Loan'.");
    } else if (notes.includes("expiring")) {
      recommendations.push("Offer hassle-free loan renewal/refinance with waived processing fees.");
    } else {
      recommendations.push("Suggest flexible repayment term of 36-60 months.");
    }

  } else if (productType === "Travel Elite Credit Card") {
    // Travel transactions count
    const travelTx = transactions.filter(t => t.category === "Travel");
    if (travelTx.length >= 3) {
      score += 45;
      factors.push("Frequently transacts on travel (flights, hotels) with " + travelTx.length + " transactions in 30 days (+45%)");
    } else if (travelTx.length >= 1) {
      score += 20;
      factors.push("Identified travel activity in recent transaction history (+20%)");
    }

    // ATM fees & Foreign transactions
    const atmFees = transactions.filter(t => t.category === "ATM Fee" || t.description.toLowerCase().includes("foreign") || t.description.toLowerCase().includes("airport"));
    if (atmFees.length > 0 || notes.includes("foreign transaction") || notes.includes("international travel") || notes.includes("business trips")) {
      score += 25;
      factors.push("Incurs high foreign transaction fees or travels internationally (+25%)");
    }

    // Credit profile
    if (creditScore >= 720) {
      score += 20;
      factors.push("Strong credit score (" + creditScore + ") meets premium card requirements (+20%)");
    } else if (creditScore < 640) {
      score -= 35;
      factors.push("Credit standing (" + creditScore + ") below premium threshold (-35%)");
    }

    // Existing products
    if (activeProducts.includes("Premium Travel Card") || activeProducts.includes("Travel Elite Credit Card")) {
      score = 5; // already has it
      factors = ["Already holds a premium travel rewards product."];
    } else {
      if (!activeProducts.some(p => p.toLowerCase().includes("credit card"))) {
        score += 10;
        factors.push("Has no active credit card; open to onboarding (+10%)");
      }
    }

    score = Math.max(5, Math.min(98, score));
    recommendations.push("Highlight zero foreign exchange markups and 3x rewards points on travel.");
    recommendations.push("Offer complimentary airport lounge access vouchers upon first purchase.");

  } else if (productType === "Wealth Advisory") {
    // Assets size
    if (totalBalance >= 300000) {
      score += 50;
      factors.push("Ultra High Net Worth client with balance of $" + totalBalance.toLocaleString() + " (+50%)");
    } else if (totalBalance >= 100000) {
      score += 35;
      factors.push("High Net Worth client with balance of $" + totalBalance.toLocaleString() + " (+35%)");
    } else if (totalBalance < 20000) {
      score -= 40;
      factors.push("Insufficient assets under management to qualify for personal advisory (-40%)");
    }

    // Notes interest
    if (notes.includes("investment advisory") || notes.includes("wealth advisory") || notes.includes("estate planning") || notes.includes("investment options")) {
      score += 25;
      factors.push("Active interest in portfolio management, wealth services, or estate planning recorded (+25%)");
    }
    
    // Low yields checks
    if (activeProducts.includes("Premium Savings") || activeProducts.includes("High-Yield Savings")) {
      score += 15;
      factors.push("Funds currently held in cash accounts; potential to optimize for yield (+15%)");
    }

    if (activeProducts.includes("Investment Portfolio") || activeProducts.includes("Wealth Management")) {
      score = 15; // Already managed
      factors.push("Already enrolled in full wealth management services.");
    }

    score = Math.max(5, Math.min(98, score));
    if (customer.riskProfile === "Conservative") {
      recommendations.push("Propose tax-free municipal bonds, fixed treasury yields, and capital protection products.");
    } else {
      recommendations.push("Propose our Managed Growth Portfolio with blended equity-debt and alternative assets.");
    }
    recommendations.push("Schedule a complimentary review session with Senior Wealth Advisor.");
  } else {
    // General / default fallback
    score = 50;
    factors.push("Standard evaluation model applied.");
  }

  // Round score
  score = Math.round(score);

  return {
    success: true,
    customerId,
    customerName: customer.name,
    productType,
    conversionScore: score,
    likelihood: score > 75 ? "High" : score > 45 ? "Medium" : "Low",
    justification: factors,
    recommendations
  };
}

/**
 * Generate a highly personalized WhatsApp message for the customer.
 * @param {string} customerId
 * @param {string} productType
 * @param {string} channel - "WhatsApp" | "Email"
 */
export function generate_personalized_message(customerId, productType, channel = "WhatsApp") {
  const customer = mockCustomers.find(c => c.id === customerId);
  if (!customer) {
    return { success: false, error: `Customer with ID ${customerId} not found.` };
  }

  const firstName = customer.name.split(" ")[0];
  let message = "";

  if (channel === "WhatsApp") {
    if (productType === "Personal Loan") {
      if (customer.notes.toLowerCase().includes("expiring")) {
        message = `Hello ${firstName}, hope you are doing well! 🌟 As your current loan with us wraps up next month, we wanted to thank you for your perfect repayment history. To support any upcoming projects, we have pre-approved you for a loan renewal or top-up at a preferred rate of 5.9% APR, with zero processing fees. Reply 'YES' if you'd like me to send over the quick terms, or let me know a good time to call! - ${customer.segment === "Ultra HNW" ? "Your Private Banker" : "Your Relationship Manager"}`;
      } else if (customer.notes.toLowerCase().includes("dental")) {
        message = `Hello Dr. ${firstName}, hope your week is off to a great start! 🏥 We've observed your dental practice's excellent transaction performance. If you are considering upgrading equipment or expanding the office this quarter, we have pre-qualified you for our Professional Practice Expansion Loan at a VIP rate. Let me know if you would like me to text over a quick quote or set up a 5-minute call to discuss. - Your Relationship Manager`;
      } else {
        message = `Hello ${firstName}, this is your Relationship Manager. We hope you're doing well! 💼 Based on your strong financial profile with us, you are pre-approved for a personal loan of up to $50,000 at a competitive rate of 6.2% APR, with flexible repayment terms. It takes less than 5 minutes to set up. Please let me know if you'd like to check the details or have a quick call.`;
      }
    } else if (productType === "Travel Elite Credit Card") {
      const travelNotes = customer.notes.toLowerCase();
      if (travelNotes.includes("italy") || travelNotes.includes("business trips") || travelNotes.includes("international")) {
        message = `Hi ${firstName}! ✈️ We noticed your frequent international travel transactions (including recent flights and hotels in Europe). Since standard cards charge up to 3% on foreign purchases, we wanted to offer you our Travel Elite Credit Card. It features 0% foreign transaction markups, 3x points on all travel bookings, and premium lounge access globally. As a special offer, we'll waive the first year's annual fee. Let me know if I should activate this for you!`;
      } else {
        message = `Hi ${firstName}! 🌟 Since you're traveling frequently, we wanted to share that you are pre-approved for our Travel Elite Credit Card. It features 0% foreign transaction markup, complimentary global airport lounge access, and 3x rewards points on travel & dining. Reply 'DETAILS' if you'd like me to send a 1-page summary, or we can activate it right here. Have a safe next trip!`;
      }
    } else if (productType === "Wealth Advisory") {
      if (customer.riskProfile === "Conservative") {
        message = `Hello ${customer.segment === "Ultra HNW" ? "Mr./Ms. " + customer.name.split(" ").slice(-1)[0] : firstName}, hope you are well. 📈 We notice you have a healthy balance in savings earning low interest. Given your preference for capital preservation, our Senior Wealth Advisor has curated a selection of tax-free municipal bonds and treasury solutions yielding over 4.8% with zero market risk. Let me know if you are open to a brief 10-minute phone consult this Wednesday to review these portfolios.`;
      } else {
        message = `Hello ${firstName}, I hope you are doing well! 🚀 With your account balance growing, we wanted to offer you a complimentary portfolio analysis with our Senior Wealth Management team. We have premium investment strategies designed to maximize yield for your growth-oriented profile, keeping your tax efficiency in mind. Let me know if you would be interested in a quick Zoom call this week to look at the options.`;
      }
    } else {
      message = `Hello ${firstName}, this is your Relationship Manager. We appreciate your banking with us and wanted to check if you have any financial needs we can assist with this month. Feel free to text me here anytime.`;
    }
  } else {
    // Email channel
    if (productType === "Personal Loan") {
      message = `Subject: Pre-Approved Liquidity Offer: Special 5.9% APR for ${customer.name}\n\nDear ${firstName},\n\nWe appreciate your continued partnership with us. Based on your stellar financial profile, we have pre-approved you for a personal liquidity line of up to $50,000 at a preferred rate of 5.9% APR.\n\nKey features:\n- No application fees\n- Funds disbursed in under 24 hours\n- Flexible terms up to 60 months\n\nIf you have any upcoming personal or business expansions, this pre-approved facility is fully available. Please reply to this email or call me at my direct office number to set it up.\n\nBest regards,\nYour Relationship Manager`;
    } else {
      message = `Subject: Tailored Investment Review for ${customer.name}\n\nDear ${firstName},\n\nI hope this email finds you well. As part of our priority banking services, we regularly review accounts that hold significant cash reserves to ensure they are optimized for growth and tax efficiency.\n\nWe would like to invite you to a complimentary wealth advisory session with our Senior Portfolio Manager. We have options suited for your risk profile that can help put your savings to work.\n\nPlease let me know if you have 15 minutes to spare this week for a phone or video call.\n\nSincerely,\nYour Priority Banking Team`;
    }
  }

  return {
    success: true,
    customerId,
    customerName: customer.name,
    productType,
    channel,
    message
  };
}
