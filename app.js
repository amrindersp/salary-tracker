// Salary Tracker & Analyzer Core Application Logic

// Local State
let salaryDb = {};
let selectedYear = "2025-26";
let activeMonthAudit = "";
let auditMode = "monthly";

// Data Connection Hub Globals
let isLocalServer = false;
let CLIENT_ID = localStorage.getItem('gdriveClientId') || '';
let googleAccessToken = localStorage.getItem('gdriveAccessToken') || null;
let gdriveFileId = null;
let tokenClient = null;

const defaultFormulaVariables = [
  // Earnings
  // Basic Pay: Use "X" formula to always accept the actual slip value (changes on promotion/increment)
  { name: "Basic Pay", formula: "X", type: "Earnings", base: "Flat Value", frequency: "monthly", specificMonths: [] },
  // Other Cafeteria: 25% of Basic Pay (standard; was 20% in FY 2024-25 due to LFA restructuring)
  { name: "Other Cafeteria", formula: "25", type: "Earnings", base: "% of Basic Pay", frequency: "monthly", specificMonths: [] },
  { name: "Cafeteria Adj-HP", formula: "Emplr Paid Itax/2", type: "Earnings", base: "Custom Formula", frequency: "monthly", specificMonths: [] },
  { name: "Variable DA", formula: "53.4", type: "Earnings", base: "Custom Formula", frequency: "monthly", specificMonths: [] },
  { name: "Maint charge WG", formula: "25", type: "Earnings", base: "Custom Formula", frequency: "yearly", specificMonths: ["April"] },
  { name: "Uniform Reimb", formula: "25", type: "Earnings", base: "Custom Formula", frequency: "quarterly", specificMonths: ["April", "July", "October", "January"] },
  { name: "WG value adjust-", formula: "-1906.67", type: "Earnings", base: "Flat Value", frequency: "monthly", specificMonths: [] },
  { name: "House Rent Allow", formula: "9", type: "Earnings", base: "% of Basic Pay", frequency: "monthly", specificMonths: [] },
  // LFA Allowance: 10% standard (was 15% in FY 2024-25 when cafeteria was restructured to 20%)
  { name: "LFA Allowance-Ca", formula: "10", type: "Earnings", base: "% of Basic Pay", frequency: "monthly", specificMonths: [] },
  { name: "CMRE", formula: "12740", type: "Earnings", base: "Flat Value", frequency: "monthly", specificMonths: [] },
  
  // Deductions
  { name: "CPF EEC", formula: "12", type: "Deductions", base: "% of Basic+DA", frequency: "monthly", specificMonths: [] },
  { name: "Income Tax", formula: "0", type: "Deductions", base: "Custom Formula", frequency: "monthly", specificMonths: [] },
  { name: "Prof Tax", formula: "200", type: "Deductions", base: "Custom Formula", frequency: "monthly", specificMonths: [] },
  { name: "Emplr Paid Itax", formula: "0", type: "Deductions", base: "Custom Formula", frequency: "monthly", specificMonths: [] },
  // NPS EEC: Use "X" to accept actual value (changed: 3571 → 4200 → 8400 → 20000 across periods)
  { name: "NPS EEC", formula: "X", type: "Deductions", base: "Flat Value", frequency: "monthly", specificMonths: [] },
  { name: "CSS Scheme", formula: "2000", type: "Deductions", base: "Flat Value", frequency: "monthly", specificMonths: [] },
  { name: "Emp PRBS contrib", formula: "3", type: "Deductions", base: "% of Basic+DA", frequency: "monthly", specificMonths: [] },
  // PRBS Addl: Use "X" to accept actual value (changes each FY: 11493→12999→14027→15850→50.77)
  { name: "PRBS  Addl", formula: "X", type: "Deductions", base: "Flat Value", frequency: "monthly", specificMonths: [] },
  // ASTO Rec: Use "X" to accept actual value (changed from 25 to 50 in Dec 2025)
  { name: "ASTO Rec", formula: "X", type: "Deductions", base: "Flat Value", frequency: "monthly", specificMonths: [] },
  { name: "Association Membership", formula: "25", type: "Deductions", base: "Flat Value", frequency: "monthly", specificMonths: [] },
  { name: "C&T Scty I", formula: "1000", type: "Deductions", base: "Flat Value", frequency: "monthly", specificMonths: [] },
  { name: "Officers' Club", formula: "100", type: "Deductions", base: "Flat Value", frequency: "monthly", specificMonths: [] },
  // White goods Rent: Use "X" to accept actual value (varies per rent review cycle)
  { name: "White goods Rent", formula: "X", type: "Deductions", base: "Flat Value", frequency: "monthly", specificMonths: [] },
  { name: "Sahyog Fund", formula: "500", type: "Deductions", base: "Flat Value", frequency: "half-yearly", specificMonths: ["September", "March"] },
  { name: "HCMRS Ins Scheme", formula: "401", type: "Deductions", base: "Flat Value", frequency: "quarterly", specificMonths: ["January", "April", "July", "October"] },
  // HRR incl retro: House Rent Recovery with retrospective adjustment — accept actual value
  { name: "HRR incl retro", formula: "X", type: "Deductions", base: "Flat Value", frequency: "monthly", specificMonths: [] },
  
  // Employer Contributions
  { name: "erc_cpf", formula: "12", type: "Employer Contributions", base: "% of Basic+DA", frequency: "monthly", specificMonths: [] },
  { name: "erc_eps", formula: "0", type: "Employer Contributions", base: "Flat Value", frequency: "monthly", specificMonths: [] },
  { name: "erc_nps", formula: "14", type: "Employer Contributions", base: "% of Basic+DA+Arr. Variable DA", frequency: "monthly", specificMonths: [] },
  { name: "erc_prbs", formula: "0.5", type: "Employer Contributions", base: "% of Basic+DA", frequency: "monthly", specificMonths: [] },
  { name: "erc_csss", formula: "2000", type: "Employer Contributions", base: "Flat Value", frequency: "monthly", specificMonths: [] },
  
  // Perks
  { name: "Housing", formula: "10", type: "Perks", base: "% of Basic Pay", frequency: "monthly", specificMonths: [] },
  { name: "Int loan", formula: "28984", type: "Perks", base: "Flat Value", frequency: "monthly", specificMonths: [] },
  { name: "Asset Tra", formula: "4800", type: "Perks", base: "Flat Value", frequency: "monthly", specificMonths: [] },
  
  // Loans
  { name: "Car/4 Wheeler", formula: "6250", type: "Loans", base: "Flat Value", frequency: "monthly", specificMonths: [] }
];

// Calculation Rules Default (Editable in UI)
let formulaRules = {
  ruleBasicInc: 3.0,
  ruleCafeteria: 35.0,
  ruleDA: 53.4, // defaults to 2026 expected
  ruleCPF: 12.0,
  ruleCSSS: 2000,
  rulePRBS: 3.0,
  ruleUniform: 264670.20, // 2026-27 annual value
  variables: []
};

// Chronological month sequence (April to March)
const monthOrder = [
  "April", "May", "June", "July", "August", "September", 
  "October", "November", "December", "January", "February", "March"
];

// Active parsed slip placeholder in Mapper view
let activeParsedSlip = null;


function migrateSalaryDb() {
  if (salaryDb["2026-27"]) {
    let changed = false;
    const april = salaryDb["2026-27"]["April"];
    if (april && april.metadata && (!april.metadata.erc_cpf || april.metadata.erc_cpf === 0)) {
      april.metadata.erc_eps = 0;
      april.metadata.erc_nps = 16820;
      april.metadata.erc_prbs = 600.74;
      april.metadata.erc_cpf = 14417;
      april.metadata.erc_csss = 2000;
      changed = true;
    }
    const may = salaryDb["2026-27"]["May"];
    if (may && may.metadata && (!may.metadata.erc_cpf || may.metadata.erc_cpf === 0)) {
      may.metadata.erc_eps = 0;
      may.metadata.erc_nps = 16974;
      may.metadata.erc_prbs = 605.65;
      may.metadata.erc_cpf = 14549;
      may.metadata.erc_csss = 2000;
      changed = true;
    }
    if (changed) {
      localStorage.setItem('salaryDb', JSON.stringify(salaryDb));
    }
  }
}

/**
 * Seeds known per-FY formula overrides for standard structural pay changes.
 * Called during initApp() after loading from localStorage.
 * Only seeds a FY if it hasn't been explicitly created by the user yet.
 */
function applyPerFYFormulaSeeds() {
  // Per-FY structural overrides: { fy: { componentName: { formula, base } } }
  const fyStructuralSeeds = {
    // FY 2022-23: Standard structure - Other Cafeteria 25%, LFA 10%, HCMRS 462
    "2022-23": {
      "Other Cafeteria": { formula: "25", base: "% of Basic Pay" },
      "LFA Allowance-Ca": { formula: "10", base: "% of Basic Pay" },
      "WG value adjust-": { formula: "-1283.33", base: "Flat Value" },
      "HCMRS Ins Scheme": { formula: "462", base: "Flat Value" }
    },
    // FY 2023-24: Standard structure - Other Cafeteria 25%, LFA 10%, HCMRS 462
    "2023-24": {
      "Other Cafeteria": { formula: "25", base: "% of Basic Pay" },
      "LFA Allowance-Ca": { formula: "10", base: "% of Basic Pay" },
      "WG value adjust-": { formula: "-1283.33", base: "Flat Value" },
      "HCMRS Ins Scheme": { formula: "462", base: "Flat Value" }
    },
    // FY 2024-25: Pay restructured — Other Cafeteria 20%, LFA 15%, HCMRS revised to 432
    "2024-25": {
      "Other Cafeteria": { formula: "20", base: "% of Basic Pay" },
      "LFA Allowance-Ca": { formula: "15", base: "% of Basic Pay" },
      "WG value adjust-": { formula: "-1906.67", base: "Flat Value" },
      "HCMRS Ins Scheme": { formula: "432", base: "Flat Value" }
    },
    // FY 2025-26: Standard cafeteria restored (25%/10%), HCMRS revised to 401
    "2025-26": {
      "Other Cafeteria": { formula: "25", base: "% of Basic Pay" },
      "LFA Allowance-Ca": { formula: "10", base: "% of Basic Pay" },
      "WG value adjust-": { formula: "-1906.67", base: "Flat Value" },
      "HCMRS Ins Scheme": { formula: "401", base: "Flat Value" }
    }
  };

  let changed = false;

  for (const fy in fyStructuralSeeds) {
    // Get or create per-FY variables array
    if (!formulaRules.variables[fy]) {
      // Clone from the latest available year as base
      const years = Object.keys(formulaRules.variables).filter(y => y !== "default").sort();
      const template = years.length > 0
        ? formulaRules.variables[years[years.length - 1]]
        : formulaRules.variables["default"] || defaultFormulaVariables;
      formulaRules.variables[fy] = JSON.parse(JSON.stringify(template));
      changed = true;
    }

    const fyVars = formulaRules.variables[fy];
    const overrides = fyStructuralSeeds[fy];

    for (const compName in overrides) {
      const override = overrides[compName];
      const existing = fyVars.find(v => v.name === compName);
      if (existing) {
        // Only update if currently at the default (not user-customized)
        // We detect this by checking if the formula matches any recent default value
        if (existing.formula !== override.formula) {
          existing.formula = override.formula;
          existing.base = override.base;
          changed = true;
        }
      } else {
        // Doesn't exist yet, add from defaults with override applied
        const defVar = defaultFormulaVariables.find(v => v.name === compName);
        if (defVar) {
          const newVar = JSON.parse(JSON.stringify(defVar));
          newVar.formula = override.formula;
          newVar.base = override.base;
          fyVars.push(newVar);
          changed = true;
        }
      }
    }
  }

  if (changed) {
    localStorage.setItem('formulaRulesVariables', JSON.stringify(formulaRules.variables));
  }
}

function initApp() {
  // Try to load state from localStorage first
  const savedDb = localStorage.getItem('salaryDb');
  if (savedDb) {
    try {
      salaryDb = JSON.parse(savedDb);
    } catch(e) {
      console.error("Failed to parse saved DB from localStorage, starting clean.", e);
    }
  }

  migrateSalaryDb();

  const savedRules = localStorage.getItem('formulaRules');
  if (savedRules) {
    try {
      formulaRules = JSON.parse(savedRules);
    } catch(e) {}
  }

  const savedRulesVars = localStorage.getItem('formulaRulesVariables');
  if (savedRulesVars) {
    try {
      const parsed = JSON.parse(savedRulesVars);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        formulaRules.variables = parsed;
      } else if (Array.isArray(parsed)) {
        formulaRules.variables = {
          "default": parsed,
          "2026-27": JSON.parse(JSON.stringify(parsed))
        };
      }
    } catch(e) {}
  }

  // Self-heal: deduplicate Car loan Installment and Car/4 Wheeler in formulaRulesVariables
  if (formulaRules.variables) {
    let changed = false;
    for (const year in formulaRules.variables) {
      const list = formulaRules.variables[year];
      if (Array.isArray(list)) {
        const car4wIdx = list.findIndex(v => v.name === "Car/4 Wheeler" && (v.type === "Loans" || v.type === "Loan"));
        const carInstallmentIdx = list.findIndex(v => v.name === "Car loan Installment" && (v.type === "Loans" || v.type === "Loan"));
        if (car4wIdx >= 0 && carInstallmentIdx >= 0) {
          if (list[carInstallmentIdx].formula && list[carInstallmentIdx].formula !== "6250") {
            list[car4wIdx].formula = list[carInstallmentIdx].formula;
          }
          list.splice(carInstallmentIdx, 1);
          changed = true;
        }
        
        // Employer Contributions deduplication
        const ercKeys = ["erc_cpf", "erc_prbs", "erc_csss", "erc_nps", "erc_eps"];
        ercKeys.forEach(key => {
          const normKey = normalizeComponentName(key);
          const shortIdx = list.findIndex(v => normalizeComponentName(v.name) === normKey && v.type === "Employer Contributions");
          const longIdx = list.findIndex((v, idx) => idx !== shortIdx && normalizeComponentName(v.name).startsWith(normKey) && v.type === "Employer Contributions");
          if (shortIdx >= 0 && longIdx >= 0) {
            if (list[longIdx].formula) {
              list[shortIdx].formula = list[longIdx].formula;
              list[shortIdx].base = list[longIdx].base;
            }
            list.splice(longIdx, 1);
            changed = true;
          }
        });
      }
    }
    if (changed) {
      localStorage.setItem('formulaRulesVariables', JSON.stringify(formulaRules.variables));
    }
  }
  if (!formulaRules.variables || Object.keys(formulaRules.variables).length === 0) {
    formulaRules.variables = {
      "default": defaultFormulaVariables
    };
  } else {
    // Ensure all default formula variables are present in all years
    for (const year in formulaRules.variables) {
      if (Array.isArray(formulaRules.variables[year])) {
        defaultFormulaVariables.forEach(defVar => {
          const exists = formulaRules.variables[year].some(v => v.name === defVar.name);
          if (!exists) {
            formulaRules.variables[year].push(JSON.parse(JSON.stringify(defVar)));
          }
        });
      }
    }
  }

  // Apply per-FY structural formula overrides for known standard pay structure changes.
  // These seed the correct formulas for specific FYs where the pay structure changed.
  // Only applied if the FY variables don't already exist (to preserve user customizations).
  const rulesImported = localStorage.getItem('rulesImported') === 'true';
  if (!rulesImported) {
    applyPerFYFormulaSeeds();
  }

  // Populate Year Selectors
  populateYearSelectors();
  
  // Set default active selectors
  const years = Object.keys(salaryDb).sort();
  if (years.length > 0) {
    selectedYear = years[years.length - 1]; // Select latest year
    syncYearSelectors(selectedYear);
  }
  
  // Render Dashboard
  updateDashboard();
  
  // Render spreadsheet and verification
  renderSpreadsheet();
  runAudit();
  
  // Setup drag and drop for Mapper
  setupDragAndDrop();

  // Check if we are running locally (and ensure it's not a native capacitor app wrapper)
  const isLocal = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.port === '8080' || window.location.port === '8000') &&
                  (window.location.protocol === 'http:' || window.location.protocol === 'https:');
  isLocalServer = isLocal;
  
  if (isLocal) {
    // Attempt to load rules from server on startup
    fetch('/api/get_formulas')
      .then(r => { if (r.ok) return r.json(); })
      .then(serverRules => {
        if (serverRules && serverRules.variables) {
          formulaRules = serverRules;
          localStorage.setItem('formulaRules', JSON.stringify(formulaRules));
          localStorage.setItem('formulaRulesVariables', JSON.stringify(formulaRules.variables));
          localStorage.setItem('rulesImported', 'true');
          console.log("Loaded custom formula rules from local server.");
          runAudit();
        }
      }).catch(err => console.log("No custom formula rules on disk server yet.", err));
  }

  // Only asynchronously fetch from server and refresh views on success if localStorage is empty
  if (Object.keys(salaryDb).length === 0) {
    fetch('salary_data.json')
      .then(response => {
        if (response.ok) return response.json();
        throw new Error('Server data fetch failed');
      })
      .then(serverDb => {
        salaryDb = serverDb;
        console.log("Loaded default database from salary_data.json");
        localStorage.setItem('salaryDb', JSON.stringify(salaryDb));
        
        populateYearSelectors();
        const years = Object.keys(salaryDb).sort();
        if (years.length > 0) {
          selectedYear = years[years.length - 1];
          syncYearSelectors(selectedYear);
        }
        
        updateDashboard();
        renderSpreadsheet();
        runAudit();
        updateDataHubOverview();
      })
      .catch(e => {
        console.warn("Could not fetch salary_data.json dynamically (expected if running via file://).", e);
      });
  }

  // Initialize Data Settings fields
  const clientInput = document.getElementById('gdriveClientId');
  if (clientInput) {
    clientInput.value = CLIENT_ID;
  }
  checkLocalServerStatus();
  updateDataHubOverview();

  // Initialize Google SDKs
  setTimeout(() => {
    if (window.gapi && window.google) {
      initGoogleClient();
    } else {
      console.log("Google scripts not ready yet. Checking in 1s.");
      setTimeout(() => {
        if (window.gapi && window.google) initGoogleClient();
      }, 1000);
    }
  }, 500);
}

// ----------------------------------------------------
// DYNAMIC COMPONENT CALCULATION ENGINE & EDITORS
// ----------------------------------------------------

// Helper to extract actual component values from a slip
function getComponentValueFromSlip(slip, section, componentName) {
  if (!slip) return 0;
  if (section === "Earnings" && slip.earnings) {
    return slip.earnings[componentName] || 0;
  }
  if (section === "Deductions" && slip.deductions) {
    return slip.deductions[componentName] || 0;
  }
  if (section === "Employer Contributions" && slip.metadata) {
    if (componentName === "erc_cpf") return slip.metadata.erc_cpf || 0;
    if (componentName === "erc_eps") return slip.metadata.erc_eps || 0;
    if (componentName === "erc_nps") return slip.metadata.erc_nps || 0;
    if (componentName === "erc_prbs") return slip.metadata.erc_prbs || 0;
    if (componentName === "erc_csss") return slip.metadata.erc_csss || 0;
    return slip.metadata[componentName] || 0;
  }
  if (section === "Perks" && slip.perks) {
    return slip.perks[componentName] || 0;
  }
  if (section === "Loans" && slip.loans) {
    if ((componentName === "Car loan Installment" || componentName === "Car/4 Wheeler") && slip.loans["Car/4 Wheeler"]) {
      return slip.loans["Car/4 Wheeler"].installment || 0;
    }
    if (componentName === "Balance" && slip.loans["Car/4 Wheeler"]) {
      return slip.loans["Car/4 Wheeler"].balance || 0;
    }
    if (componentName === "Acc. Intrst" && slip.loans["Car/4 Wheeler"]) {
      return slip.loans["Car/4 Wheeler"].accrued_interest || 0;
    }
    return slip.loans[componentName] || 0;
  }
  if (section === "YTD Earnings" && slip.ytd_earnings) {
    return slip.ytd_earnings[componentName] || 0;
  }
  if (section === "YTD Deductions" && slip.ytd_deductions) {
    return slip.ytd_deductions[componentName] || 0;
  }
  if (section === "Form 16" && slip.form16) {
    return slip.form16[componentName] || 0;
  }
  return 0;
}

// Helper to find previous month's actual value from chronological database
function getPreviousActualComponentValue(section, componentName, targetFy, targetMonth) {
  const slips = getChronologicalSlips();
  if (slips.length === 0) return 0;

  const monthIdx = monthOrder.indexOf(targetMonth);
  const fyStartYear = parseInt(targetFy.split('-')[0]);
  const calYear = fyStartYear + (monthIdx >= 9 ? 1 : 0);
  const calMonth = (monthIdx + 3) % 12;
  const targetPeriod = calYear * 12 + calMonth;

  // Filter for past slips
  const pastSlips = slips.filter(s => s.period < targetPeriod);

  if (pastSlips.length > 0) {
    // Search backward starting from the most recent past slip
    for (let i = pastSlips.length - 1; i >= 0; i--) {
      const val = getComponentValueFromSlip(pastSlips[i].slip, section, componentName);
      if (val !== 0 && val !== null && val !== undefined) {
        return val;
      }
    }
  }

  // Fallback: check the slip of the target month itself if it exists in the database
  const currentSlipObj = slips.find(s => s.period === targetPeriod);
  if (currentSlipObj) {
    const val = getComponentValueFromSlip(currentSlipObj.slip, section, componentName);
    if (val !== 0 && val !== null && val !== undefined) {
      return val;
    }
  }

  return 0;
}

// Helper to retrieve the actual parsed value of a component for a specific month
function getSpecificMonthActualComponentValue(section, componentName, targetFy, sourceMonth) {
  if (!sourceMonth || sourceMonth === "previous") {
    return getPreviousActualComponentValue(section, componentName, targetFy, activeMonthAudit || "March");
  }

  // 1. Try targetFy first
  if (salaryDb[targetFy] && salaryDb[targetFy][sourceMonth]) {
    const val = getComponentValueFromSlip(salaryDb[targetFy][sourceMonth], section, componentName);
    if (val !== 0 && val !== null && val !== undefined) {
      return val;
    }
  }

  // 2. Try other FYs chronologically (newest to oldest)
  const slips = getChronologicalSlips();
  const matchedSlips = slips.filter(s => s.month === sourceMonth).sort((a, b) => b.period - a.period);
  if (matchedSlips.length > 0) {
    const val = getComponentValueFromSlip(matchedSlips[0].slip, section, componentName);
    if (val !== 0 && val !== null && val !== undefined) {
      return val;
    }
  }

  return 0;
}

function sortVariables(vars) {
  const sectionOrder = [
    "Earnings",
    "Deductions",
    "Employer Contributions",
    "Loans",
    "YTD Earnings",
    "YTD Deductions",
    "Perks",
    "Form 16"
  ];
  vars.sort((a, b) => {
    const typeA = a.type || "";
    const typeB = b.type || "";
    const idxA = sectionOrder.indexOf(typeA);
    const idxB = sectionOrder.indexOf(typeB);
    const valA = idxA === -1 ? 999 : idxA;
    const valB = idxB === -1 ? 999 : idxB;
    if (valA !== valB) {
      return valA - valB;
    }
    const nameA = a.name || "";
    const nameB = b.name || "";
    return nameA.localeCompare(nameB);
  });
}

function getVariablesForFy(fy) {
  if (!formulaRules.variables) {
    formulaRules.variables = { "default": defaultFormulaVariables };
  }
  // Migrate legacy flat array
  if (Array.isArray(formulaRules.variables)) {
    const legacy = formulaRules.variables;
    formulaRules.variables = {
      "default": legacy,
      "2026-27": JSON.parse(JSON.stringify(legacy))
    };
    localStorage.setItem('formulaRulesVariables', JSON.stringify(formulaRules.variables));
  }
  if (formulaRules.variables[fy]) {
    sortVariables(formulaRules.variables[fy]);
    return formulaRules.variables[fy];
  }
  // Closest available year fallback
  const years = Object.keys(formulaRules.variables).filter(y => y !== "default");
  let template = formulaRules.variables["default"] || defaultFormulaVariables;
  if (years.length > 0) {
    years.sort();
    template = formulaRules.variables[years[years.length - 1]];
  }
  formulaRules.variables[fy] = JSON.parse(JSON.stringify(template));
  // Ensure default variables exist
  defaultFormulaVariables.forEach(defVar => {
    const exists = formulaRules.variables[fy].some(v => v.name === defVar.name);
    if (!exists) {
      formulaRules.variables[fy].push(JSON.parse(JSON.stringify(defVar)));
    }
  });
  sortVariables(formulaRules.variables[fy]);
  localStorage.setItem('formulaRulesVariables', JSON.stringify(formulaRules.variables));
  return formulaRules.variables[fy];
}

function isMonthInPeriod(month, startMonth, endMonth) {
  const mIdx = monthOrder.indexOf(month);
  const startIdx = monthOrder.indexOf(startMonth);
  const endIdx = monthOrder.indexOf(endMonth);
  if (mIdx === -1 || startIdx === -1 || endIdx === -1) return false;
  if (startIdx <= endIdx) {
    return mIdx >= startIdx && mIdx <= endIdx;
  } else {
    return mIdx >= startIdx || mIdx <= endIdx;
  }
}

// Helper to retrieve the latest available employee metadata in database
function getLastAvailableMetadata() {
  const slips = getChronologicalSlips();
  if (slips.length > 0) {
    const lastSlip = slips[slips.length - 1].slip;
    return lastSlip.metadata || {};
  }
  return {};
}

function getMonthProrationAndRates(verFy, mName) {
  const s = (salaryDb[verFy] && salaryDb[verFy][mName]) ? salaryDb[verFy][mName] : null;
  if (s) {
    const b = s.earnings["Basic Pay"] || 0;
    const d = s.earnings["Variable DA"] || 0;
    const sPayrate = (s.metadata && s.metadata.payrate) || b;
    const bForPct = Math.abs(b - sPayrate) > 100 ? sPayrate : b;
    const sProrationFactor = Math.abs(b - sPayrate) > 100 ? (b / sPayrate) : 1.0;
    return { basic: b, da: d, payrate: sPayrate, bForPct, proration: sProrationFactor, slip: s };
  }
  
  // Find any month with a slip in the same financial year to act as baseline
  const allMonths = Object.keys(salaryDb[verFy] || {});
  if (allMonths.length > 0) {
    let closestMonth = allMonths[0];
    let minDiff = 12;
    const targetIdx = monthOrder.indexOf(mName);
    allMonths.forEach(m => {
      const diff = Math.abs(monthOrder.indexOf(m) - targetIdx);
      if (diff < minDiff) {
        minDiff = diff;
        closestMonth = m;
      }
    });
    const cs = salaryDb[verFy][closestMonth];
    const b = cs.earnings["Basic Pay"] || 0;
    const d = cs.earnings["Variable DA"] || 0;
    const sPayrate = (cs.metadata && cs.metadata.payrate) || b;
    return { basic: b, da: d, payrate: sPayrate, bForPct: sPayrate, proration: 1.0, slip: null };
  }
  
  // Fallback to rules defaults
  const vars = getVariablesForFy(verFy);
  const basicVar = vars.find(v => normalizeComponentName(v.name) === "basicpay") || {};
  const daVar = vars.find(v => normalizeComponentName(v.name) === "variableda") || {};
  const bVal = parseFloat(basicVar.formula) || 80000;
  const dRate = parseFloat(daVar.formula) || getDA_RateForMonth(verFy, mName) || 50.0;
  const dVal = bVal * (dRate / 100);
  return { basic: bVal, da: dVal, payrate: bVal, bForPct: bVal, proration: 1.0, slip: null };
}

function evaluateCustomFormula(formulaStr, verFy, month, basic, da, slip, evalStack = new Set(), currentNormCompName = "") {
  let expr = normalizeFormulaString(formulaStr);
  
  // Special keywords
  if (expr.includes("taxincm")) {
    const taxIncm = calculateExpectedYtdTaxableIncome(verFy, month);
    expr = expr.replace(/taxincm/g, taxIncm.toString());
  }
  if (expr.includes("no.ofmonths") || expr.includes("noofmonths")) {
    const elapsedMonths = monthOrder.indexOf(month) + 1;
    expr = expr.replace(/no\.ofmonths/g, elapsedMonths.toString())
               .replace(/noofmonths/g, elapsedMonths.toString());
  }
  if (expr.includes("basicpay") || expr.includes("basic")) {
    expr = expr.replace(/basicpay/g, basic.toString())
               .replace(/basic/g, basic.toString());
  }
  if (expr.includes("variableda") || expr.includes("da")) {
    expr = expr.replace(/variableda/g, da.toString())
               .replace(/da/g, da.toString());
  }
  if (expr.includes("arrearsotherthanaprilmonth")) {
    let arrVal = 0;
    if (month !== "April" && slip && slip.earnings) {
      Object.entries(slip.earnings).forEach(([k, v]) => {
        if (k.startsWith("Arr.") && !k.startsWith("Arr.Rec")) {
          arrVal += v || 0;
        }
      });
    }
    expr = expr.replace(/arrearsotherthanaprilmonth/g, arrVal.toString());
  }
  
  // Dynamic rule variables replacement
  const allVars = getVariablesForFy(verFy);
  const sortedVars = [...allVars].sort((a, b) => b.name.length - a.name.length);
  
  for (const variable of sortedVars) {
    const searchKeys = getSearchKeysForVariable(variable);
    const vNorm = normalizeComponentName(variable.name);
    
    for (const key of searchKeys) {
      if (key && expr.includes(key)) {
        let replacementVal = 0;
        if (!evalStack.has(vNorm)) {
          const nextStack = new Set(evalStack);
          if (currentNormCompName) {
            nextStack.add(currentNormCompName);
          }
          replacementVal = getExpectedComponentValue(variable.type, variable.name, verFy, month, basic, da, slip, nextStack) || 0;
        }
        expr = expr.split(key).join(replacementVal.toString());
      }
    }
  }

  // Fallback to slip actual values for any remaining variables
  if (slip && /[a-z]/i.test(expr)) {
    const slipKeys = [];
    const collectKeys = (sectionObj) => {
      if (sectionObj) {
        Object.keys(sectionObj).forEach(k => {
          const spaceless = k.toLowerCase().replace(/\s+/g, '');
          const normName = normalizeComponentName(k);
          const keys = new Set();
          keys.add(spaceless);
          keys.add(normName);
          
          let spacelessReplaced = spaceless;
          spacelessReplaced = spacelessReplaced.replace(/maintenance/g, 'maint')
                                               .replace(/society/g, 'scty')
                                               .replace(/insurance/g, 'ins')
                                               .replace(/scheme/g, 'sch')
                                               .replace(/employer/g, 'emplr')
                                               .replace(/additional/g, 'addl');
          keys.add(spacelessReplaced);
          
          slipKeys.push({
            originalName: k,
            searchKeys: Array.from(keys).sort((a, b) => b.length - a.length)
          });
        });
      }
    };
    collectKeys(slip.earnings);
    collectKeys(slip.deductions);
    collectKeys(slip.perks);
    collectKeys(slip.ytd_earnings);
    collectKeys(slip.ytd_deductions);
    
    // Sort slipKeys by longest search key length descending
    slipKeys.sort((a, b) => b.searchKeys[0].length - a.searchKeys[0].length);
    
    for (const keyObj of slipKeys) {
      for (const searchKey of keyObj.searchKeys) {
        if (searchKey && expr.includes(searchKey)) {
          let val = 0;
          if (slip.earnings && slip.earnings[keyObj.originalName] !== undefined) {
            val = slip.earnings[keyObj.originalName] || 0;
          } else if (slip.deductions && slip.deductions[keyObj.originalName] !== undefined) {
            val = slip.deductions[keyObj.originalName] || 0;
          } else if (slip.perks && slip.perks[keyObj.originalName] !== undefined) {
            val = slip.perks[keyObj.originalName] || 0;
          } else if (slip.ytd_earnings && slip.ytd_earnings[keyObj.originalName] !== undefined) {
            val = slip.ytd_earnings[keyObj.originalName] || 0;
          } else if (slip.ytd_deductions && slip.ytd_deductions[keyObj.originalName] !== undefined) {
            val = slip.ytd_deductions[keyObj.originalName] || 0;
          }
          expr = expr.split(searchKey).join(val.toString());
          break; // move to next slip key
        }
      }
    }
  }

  if (/^[0-9.+\-*/()]+$/.test(expr)) {
    try {
      return Math.round(new Function(`return ${expr}`)() * 100) / 100;
    } catch(e) {
      console.error("Error evaluating custom formula:", formulaStr, expr, e);
    }
  }
  
  return null;
}

function calculateExpectedYtdValue(ytdKey, verFy, targetMonth) {
  const selectedMonthIdx = monthOrder.indexOf(targetMonth);
  const ytdMonthsList = monthOrder.slice(0, selectedMonthIdx + 1);
  let sum = 0;

  const ytdToMonthlyMap = {
    "PAY": { section: "Earnings", name: "Basic Pay" },
    "DA": { section: "Earnings", name: "Variable DA" },
    "HRA": { section: "Earnings", name: "House Rent Allow" },
    "CMRE": { section: "Earnings", name: "CMRE" },
    "CPF": { section: "Deductions", name: "CPF EEC" },
    "CSSS": { section: "Deductions", name: "CSS Scheme" },
    "P. Tax": { section: "Deductions", name: "Prof Tax" },
    "I. Tax": { section: "Deductions", name: "Income Tax" },
    "Eec PRBS": { section: "Deductions", name: "Emp PRBS contrib" },
    "Erc PRBS": { section: "Employer Contributions", name: "erc_prbs" },
    "Erc NPS": { section: "Employer Contributions", name: "erc_nps" },
    "EEC NPS": { section: "Deductions", name: "NPS EEC" },
    "HCMRS sch": { section: "Deductions", name: "HCMRS Ins Scheme" },
    "Other (T)": { section: "YTD Earnings", name: "Other (T)" },
    "Other(NT)": { section: "YTD Earnings", name: "Other(NT)" },
    "Other Pay": { section: "YTD Earnings", name: "Other Pay" },
    "Prev.Yrs.": { section: "YTD Earnings", name: "Prev.Yrs." },
    "Incentive": { section: "YTD Earnings", name: "Incentive" },
    "Hard Duty": { section: "YTD Earnings", name: "Hard Duty" }
  };

  const targetMapping = ytdToMonthlyMap[ytdKey];
  if (!targetMapping) {
    return 0;
  }

  const section = targetMapping.section;
  const compName = targetMapping.name;

  const vars = getVariablesForFy(verFy);
  const v = vars.find(item => {
    const rType = (item.type || "").toLowerCase().trim();
    const isTypeMatch = (rType === "ytd earnings" || rType === "ytd deductions");
    return isTypeMatch && normalizeComponentName(item.name) === normalizeComponentName(ytdKey);
  });

  let isCumulativeFormula = false;
  let innerFormula = "";
  if (v && v.formula) {
    const fStr = v.formula.toString().trim();
    const match = fStr.match(/[Cc]u[m]{1,2}ulative\s*\(([^)]+)\)/i);
    if (match) {
      isCumulativeFormula = true;
      innerFormula = match[1];
    }
  }

  ytdMonthsList.forEach(mName => {
    const rates = getMonthProrationAndRates(verFy, mName);
    const s = rates.slip;
    const b = rates.basic;
    const d = rates.da;
    const bForPct = rates.bForPct;
    const sProrationFactor = rates.proration;

    const expBasic = getExpectedComponentValue("Earnings", "Basic Pay", verFy, mName, bForPct, d, s) || bForPct;
    const expDa = getExpectedComponentValue("Earnings", "Variable DA", verFy, mName, expBasic, d, s) || d;

    const expBasicProrated = expBasic * sProrationFactor;
    const expDaProrated = expDa * sProrationFactor;

    let expVal = 0;
    if (ytdKey === "PAY") {
      expVal = expBasicProrated + (s ? (s.earnings["Arr.Basic Pay"] || 0) : 0);
    } else if (ytdKey === "DA") {
      expVal = expDaProrated + (s ? (s.earnings["Arr.Variable DA"] || 0) : 0);
    } else if (ytdKey === "HRA") {
      expVal = (getExpectedComponentValue("Earnings", "House Rent Allow", verFy, mName, expBasic, expDa, s) || 0) + (s ? (s.earnings["Arr.HR Allowance"] || 0) : 0);
    } else if (ytdKey === "CMRE") {
      expVal = (getExpectedComponentValue("Earnings", "CMRE", verFy, mName, expBasic, expDa, s) || 0) + (s ? (s.earnings["Arr. CMRE"] || s.earnings["Arr.CMRE"] || 0) : 0);
    } else if (ytdKey === "CSSS") {
      expVal = (getExpectedComponentValue("Deductions", "CSS Scheme", verFy, mName, expBasicProrated, expDaProrated, s) || 0) + (s ? (s.deductions["Arr.CSS Scheme"] || 0) : 0);
    } else if (ytdKey === "Eec PRBS") {
      expVal = (getExpectedComponentValue("Deductions", "Emp PRBS contrib", verFy, mName, expBasicProrated, expDaProrated, s) || 0) +
               (getExpectedComponentValue("Deductions", "PRBS  Addl", verFy, mName, expBasicProrated, expDaProrated, s) || 0) +
               (s ? (s.deductions["Arr.PRBS Addl"] || 0) : 0);
    } else if (ytdKey === "I. Tax") {
      expVal = (getExpectedComponentValue("Deductions", "Income Tax", verFy, mName, expBasicProrated, expDaProrated, s) || 0) +
               (s ? (s.deductions["Emplyr paid ITax"] || s.deductions["Emplr Paid Itax"] || 0) : 0);
    } else {
      // General lookup
      const basicVal = (section === "Deductions" || section === "Employer Contributions") ? expBasicProrated : expBasic;
      const daVal = (section === "Deductions" || section === "Employer Contributions") ? expDaProrated : expDa;

      if (isCumulativeFormula) {
        const tempExp = evaluateCustomFormula(innerFormula, verFy, mName, basicVal, daVal, s, new Set(), normalizeComponentName(ytdKey));
        if (tempExp !== null) {
          expVal = tempExp;
        } else {
          // fallback to actual value in slip
          const useYtdChange = (section === "YTD Earnings" || section === "YTD Deductions");
          expVal = s ? (useYtdChange ? getMonthlyActualChangeFromSlip(s, section, compName, verFy, mName) : getComponentValueFromSlip(s, section, compName)) : 0;
        }
      } else {
        const isUnexplained = isComponentUnexplained(section, compName, verFy);
        if (isUnexplained) {
          expVal = 0;
        } else {
          const tempExp = getExpectedComponentValue(section, compName, verFy, mName, basicVal, daVal, s);
          if (tempExp !== null) {
            expVal = tempExp;
          } else {
            // fallback to actual value in slip
            const useYtdChange = (section === "YTD Earnings" || section === "YTD Deductions");
            expVal = s ? (useYtdChange ? getMonthlyActualChangeFromSlip(s, section, compName, verFy, mName) : getComponentValueFromSlip(s, section, compName)) : 0;
          }
        }
      }
    }
    sum += expVal;
  });

  return sum;
}

function calculateExpectedYtdTotalIncome(verFy, targetMonth) {
  const earningsKeys = ["PAY", "DA", "HRA", "CMRE", "Other (T)", "Other(NT)", "Other Pay", "Prev.Yrs.", "Incentive", "Hard Duty"];
  let sum = 0;
  earningsKeys.forEach(k => {
    sum += calculateExpectedYtdValue(k, verFy, targetMonth);
  });
  return sum;
}

function calculateExpectedYtdTaxableIncome(verFy, targetMonth) {
  const totalIncome = calculateExpectedYtdTotalIncome(verFy, targetMonth);
  const otherNT = calculateExpectedYtdValue("Other(NT)", verFy, targetMonth);
  return totalIncome - otherNT;
}

function calculateComponentFormulaValue(v, formulaStr, verFy, month, basic, da, slip, evalStack, normCompName) {
  if (formulaStr !== undefined && formulaStr !== null && formulaStr.toString().trim().toLowerCase() === "x") {
    const actualSlip = (salaryDb[verFy] && salaryDb[verFy][month]) ? salaryDb[verFy][month] : null;
    if (slip && slip === actualSlip) {
      return getComponentValueFromSlip(slip, v.type, v.name);
    } else {
      const srcMonth = v.xSourceMonth || "previous";
      if (srcMonth === "previous") {
        return getPreviousActualComponentValue(v.type, v.name, verFy, month);
      } else {
        return getSpecificMonthActualComponentValue(v.type, v.name, verFy, srcMonth);
      }
    }
  }

  const numValue = parseFloat(formulaStr);
  const base = v.base;
  
  if (base === "% of Basic Pay") {
    return isNaN(numValue) ? 0 : Math.round(basic * (numValue / 100) * 100) / 100;
  } else if (base === "% of Basic+DA") {
    return isNaN(numValue) ? 0 : Math.round((basic + da) * (numValue / 100) * 100) / 100;
  } else if (base === "% of Basic+DA+Arr. Variable DA") {
    const arrDA = slip ? (slip.earnings["Arr.Variable DA"] || 0) : 0;
    return isNaN(numValue) ? 0 : Math.round((basic + da + arrDA) * (numValue / 100) * 100) / 100;
  } else if (base === "Flat Value") {
    // Self-heal: If user typed a mathematical formula in a flat value field, evaluate it dynamically
    if (formulaStr && /[+\-*/]/.test(formulaStr.toString())) {
      const parsedVal = evaluateCustomFormula(formulaStr, verFy, month, basic, da, slip, evalStack, normCompName);
      if (parsedVal !== null && !isNaN(parsedVal)) {
        return parsedVal;
      }
    }
    return isNaN(numValue) ? 0 : numValue;
  } else if (base === "Custom Formula") {
    const cName = v.name;
    
    // 1. Keep hardcoded exceptions first
    if (cName === "Cafeteria Adj-HP") {
      const itax = slip ? (slip.deductions["Emplyr paid ITax"] || slip.deductions["Emplr Paid Itax"] || 0) : 0;
      return Math.round((itax / 2) * 100) / 100;
    } else if (cName === "Maint charge WG" && /^\d+(\.\d+)?$/.test(formulaStr.toString().trim())) {
      const mult = numValue;
      return (month === "April") ? (getWGValue(verFy) * (mult / 100)) : 0;
    } else if (cName === "Uniform Reimb" && /^\d+(\.\d+)?$/.test(formulaStr.toString().trim())) {
      const mult = numValue;
      return ["April", "July", "October", "January"].includes(month) ? (getUniformValue(verFy) * (mult / 100)) : 0;
    } else if (cName === "WG value adjust-") {
      return isNaN(numValue) ? getWGValAdj(verFy) : numValue;
    } else if (cName === "Prof Tax") {
      const baseVal = isNaN(numValue) ? 200 : numValue;
      return (month === "February") ? (baseVal + 100) : baseVal;
    } else if (cName === "Variable DA") {
      const rate = getDA_RateForMonth(verFy, month);
      return Math.round(basic * (rate / 100) * 100) / 100;
    } else if (cName === "Income Tax" || cName === "Emplr Paid Itax") {
      return 0; // expected recovery is 0, handled dynamically
    }
    
    // 2. Generic Custom Formula Evaluator
    return evaluateCustomFormula(formulaStr, verFy, month, basic, da, slip, evalStack, normCompName);
  }
  
  return isNaN(numValue) ? 0 : numValue;
}

function getExpectedComponentValue(section, componentName, verFy, month, basic, da, slip, evalStack = new Set()) {
  const normCompName = normalizeComponentName(componentName);
  if (evalStack.has(normCompName)) {
    return 0; // prevent circular dependency
  }
  
  const vars = getVariablesForFy(verFy);
  const v = vars.find(item => {
    const rType = (item.type || "").toLowerCase().trim();
    const sType = section.toLowerCase().trim();
    const isLoanMatch = (rType.startsWith("loan") && sType.startsWith("loan"));
    const typeMatches = (rType === sType) || isLoanMatch;
    return typeMatches && (normalizeComponentName(item.name) === normCompName || (item.name === "Car/4 Wheeler" && componentName === "Car loan Installment"));
  });
  if (!v) {
    if (componentName === "WG GST Recovery" || componentName.startsWith("Arr.Rec") || componentName.includes("Recovery") || componentName.includes("Rec")) {
      return 0;
    }
    return null;
  }
  
  // Resolve formula from splits if defined
  let formulaStr = v.formula;
  if (v.isSplit && v.splits && v.splits.length > 0) {
    const activeSplit = v.splits.find(s => isMonthInPeriod(month, s.startMonth, s.endMonth));
    if (activeSplit) {
      formulaStr = activeSplit.formula;
    } else {
      formulaStr = v.splits[0].formula;
    }
  }

  const freq = (v.frequency || "monthly").toLowerCase();

  // If frequency is cumulative, we sum up expected values chronologically
  if (freq === "cummulative" || freq === "cumulative") {
    const selectedMonthIdx = monthOrder.indexOf(month);
    if (selectedMonthIdx === -1) return 0;
    const monthsList = monthOrder.slice(0, selectedMonthIdx + 1);
    let sum = 0;
    
    // Push current component onto nextStack to prevent circular dependency
    const nextStack = new Set(evalStack);
    nextStack.add(normCompName);
    
    for (const mName of monthsList) {
      const mSlip = (salaryDb[verFy] && salaryDb[verFy][mName]) ? salaryDb[verFy][mName] : null;
      let mBasic = 0;
      let mDa = 0;
      let mPayrate = 0;
      if (mSlip) {
        mBasic = mSlip.earnings["Basic Pay"] || 0;
        mDa = mSlip.earnings["Variable DA"] || 0;
        mPayrate = (mSlip.metadata && mSlip.metadata.payrate) || mBasic;
      }
      
      const mBasicForPct = Math.abs(mBasic - mPayrate) > 100 ? mPayrate : mBasic;
      const mProrationFactor = Math.abs(mBasic - mPayrate) > 100 ? (mBasic / mPayrate) : 1.0;
      
      const expBasic = getExpectedComponentValue("Earnings", "Basic Pay", verFy, mName, mBasicForPct, mDa, mSlip, nextStack) || mBasicForPct;
      const expDa = getExpectedComponentValue("Earnings", "Variable DA", verFy, mName, expBasic, mDa, mSlip, nextStack) || mDa;
      
      let targetBasic = expBasic;
      let targetDa = expDa;
      if (section === "Deductions" || section === "Employer Contributions") {
        targetBasic = expBasic * mProrationFactor;
        targetDa = expDa * mProrationFactor;
      }
      
      let mFormulaStr = v.formula;
      if (v.isSplit && v.splits && v.splits.length > 0) {
        const activeSplit = v.splits.find(s => isMonthInPeriod(mName, s.startMonth, s.endMonth));
        if (activeSplit) {
          mFormulaStr = activeSplit.formula;
        } else {
          mFormulaStr = v.splits[0].formula;
        }
      }
      
      const val = calculateComponentFormulaValue(v, mFormulaStr, verFy, mName, targetBasic, targetDa, mSlip, nextStack, normCompName);
      sum += val || 0;
    }
    return sum;
  }
  
  if (formulaStr !== undefined && formulaStr !== null && formulaStr.toString().trim().toLowerCase() === "x") {
    const actualSlip = (salaryDb[verFy] && salaryDb[verFy][month]) ? salaryDb[verFy][month] : null;
    if (slip && slip === actualSlip) {
      return getComponentValueFromSlip(slip, section, componentName);
    } else {
      const srcMonth = v.xSourceMonth || "previous";
      if (srcMonth === "previous") {
        return getPreviousActualComponentValue(section, componentName, verFy, month);
      } else {
        return getSpecificMonthActualComponentValue(section, componentName, verFy, srcMonth);
      }
    }
  }
  
  let isActive = false;
  if (freq === "monthly") {
    isActive = true;
  } else if (freq === "yearly") {
    isActive = (month === "April");
  } else if (freq === "half-yearly") {
    isActive = ["September", "March"].includes(month);
  } else if (freq === "quarterly") {
    if (v.specificMonths && v.specificMonths.length > 0) {
      isActive = v.specificMonths.includes(month);
    } else {
      isActive = ["April", "July", "October", "January"].includes(month);
    }
  } else if (freq === "specific" || freq === "specific months") {
    isActive = (v.specificMonths || []).includes(month);
  }
  
  if (!isActive) return 0;
  
  return calculateComponentFormulaValue(v, formulaStr, verFy, month, basic, da, slip, evalStack, normCompName);
}

function handleExcelUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, {type: 'array'});
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      const rows = XLSX.utils.sheet_to_json(worksheet, {header: 1});
      
      let currentSection = "Earnings";
      const newVariables = [];
      
      rows.forEach((row) => {
        if (!row || row.length === 0) return;
        const colA = (row[0] !== undefined && row[0] !== null) ? row[0].toString().trim() : "";
        const colB = (row[1] !== undefined && row[1] !== null) ? row[1].toString().trim() : "";
        const colC = (row[2] !== undefined && row[2] !== null) ? row[2].toString().trim() : "";
        
        if (!colA) return;

        // --- Section header detection ---
        const colALower = colA.toLowerCase();
        if (colALower === "earnings") {
          currentSection = "Earnings"; return;
        } else if (colALower === "deduction" || colALower === "deductions") {
          currentSection = "Deductions"; return;
        } else if (colALower.includes("employer") && colALower.includes("contribution")) {
          currentSection = "Employer Contributions"; return;
        } else if (colALower === "loan" || colALower === "loans") {
          currentSection = "Loans"; return;
        } else if (colALower.includes("ytd") && colALower.includes("earn")) {
          currentSection = "YTD Earnings"; return;
        } else if (colALower.includes("ytd") && colALower.includes("ded")) {
          currentSection = "YTD Deductions"; return;
        } else if (colALower === "perks") {
          currentSection = "Perks"; return;
        } else if (colALower.startsWith("form 16") || colALower.startsWith("form16")) {
          currentSection = "Form 16"; return;
        }

        // Skip header rows and non-formula sections
        if (colALower === "amount" || colALower === "time") return;
        if (colB === "" && colC === "") return;

        // --- Name mapping: Excel display labels → internal slip/audit names ---
        const nameMap = {
          "wg value adj-":          "WG value adjust-",
          "prbs addnl":             "PRBS  Addl",
          "prbs addl":              "PRBS  Addl",
          "ongcha mem":             "Association Membership",
          "ongcha membership":      "Association Membership",
          "c&t society i":          "C&T Scty I",
          "hcmrs insurance scheme": "HCMRS Ins Scheme",
          "hcmrs ins scheme":       "HCMRS Ins Scheme",
          "ongc sahyog fund":       "Sahyog Fund",
          "hrr incl retro":         "HRR incl retro",
          "hrr including retro":    "HRR incl retro",
          "asto rec":               "ASTO Rec",
          "emplr paid itax":        "Emplr Paid Itax",
          "emplyr paid itax":       "Emplyr paid ITax",
          // ERC display names → internal erc_ keys
          "erc eps":  "erc_eps",
          "erc prbs": "erc_prbs",
          "erc cpf":  "erc_cpf",
          "erc csss": "erc_csss",
          "erc nps":  "erc_nps",
          // YTD, Perks, Form 16 mappings
          "prev. yrs.":             "Prev.Yrs.",
          "prev. yrs":              "Prev.Yrs.",
          "prev.yrs.":              "Prev.Yrs.",
          "prev.yrs":               "Prev.Yrs.",
          "css":                    "CSSS",
          "gross sal":              "Gross Sal",
          "hcmrs sch":              "HCMRS sch",
          "i. tax&sur":             "I.Tax&Sur",
          "i.tax&sur":              "I.Tax&Sur",
          "ded us 80":              "Ded us 80",
          "std dedn":               "Std Dedn",
          "i. tax":                 "I. Tax",
          "p. tax":                 "P. Tax",
          "int loan":               "Int Loan",
          "asset tra":              "Asset Tra",
          "housing":                "Housing",
          "other (nt)":             "Other(NT)",
          "other(nt)":              "Other(NT)",
          "car loan installment":   "Car/4 Wheeler",
          "car/4 wheeler":          "Car/4 Wheeler"
        };
        let internalName = colA;
        if (currentSection === "Employer Contributions") {
          const ercMap = {
            "erc eps":  "erc_eps",
            "erc prbs": "erc_prbs",
            "erc cpf":  "erc_cpf",
            "erc csss": "erc_csss",
            "erc nps":  "erc_nps"
          };
          internalName = ercMap[colALower] || nameMap[colALower] || colA;
          // Employer Contributions: auto-convert "ERC XXX" → "erc_xxx" if not in map
          if (colALower.startsWith("erc") && !ercMap[colALower] && !nameMap[colALower]) {
            internalName = colALower.replace(/\s+/g, '_');
          }
        } else if (currentSection === "YTD Deductions") {
          const ytdDedMap = {
            "cpf": "CPF",
            "css": "CSSS",
            "wg rent": "WG Rent",
            "hrr": "HRR",
            "eec prbs": "Eec PRBS",
            "erc prbs": "Erc PRBS",
            "erc nps": "Erc NPS",
            "i. tax": "I. Tax",
            "eec nps": "EEC NPS",
            "p. tax": "P. Tax",
            "hcmrs sch": "HCMRS sch",
            "tot incm": "Tot Incm",
            "tax incm": "Tax Incm"
          };
          internalName = ytdDedMap[colALower] || nameMap[colALower] || colA;
        } else if (currentSection === "YTD Earnings") {
          const ytdEarnMap = {
            "pay": "PAY",
            "da": "DA",
            "hra": "HRA",
            "cmre": "CMRE",
            "other (t)": "Other (T)",
            "other(t)": "Other (T)",
            "other (nt)": "Other(NT)",
            "other(nt)": "Other(NT)",
            "other pay": "Other Pay",
            "prev. yrs.": "Prev.Yrs.",
            "prev. yrs": "Prev.Yrs.",
            "prev.yrs.": "Prev.Yrs.",
            "prev.yrs": "Prev.Yrs.",
            "erc prbs": "Erc PRBS",
            "incentive": "Incentive",
            "hard duty": "Hard Duty"
          };
          internalName = ytdEarnMap[colALower] || nameMap[colALower] || colA;
        } else {
          const filteredMap = { ...nameMap };
          delete filteredMap["erc eps"];
          delete filteredMap["erc prbs"];
          delete filteredMap["erc cpf"];
          delete filteredMap["erc csss"];
          delete filteredMap["erc nps"];
          internalName = filteredMap[colALower] || colA;
        }

        // --- Frequency detection ---
        let frequency = "monthly";
        let specificMonths = [];
        const cLower = colC.toLowerCase();
        if (cLower.includes("quarterly") || cLower.includes("quaterly")) {
          frequency = "quarterly";
          specificMonths = cLower.includes("january")
            ? ["January", "April", "July", "October"]
            : ["April", "July", "October", "January"];
        } else if (cLower.includes("half yearly") || cLower.includes("half-yearly") || cLower.includes("semi-annual")) {
          frequency = "half-yearly";
          specificMonths = ["September", "March"];
        } else if (cLower.includes("yearly") && !cLower.includes("half")) {
          frequency = "yearly";
          specificMonths = ["April"];
        } else if (cLower.includes("cummulative") || cLower.includes("cumulative")) {
          frequency = "cummulative";
        }

        // --- Formula & base detection ---
        const bLower = colB.toLowerCase();
        let base = "Flat Value";
        let cleanedFormula = colB;

        if (bLower === "x") {
          // "x" = accept actual value from payslip (variable amount changes each period)
          cleanedFormula = "X";
          base = "Custom Formula";
        } else if (bLower.includes("basic+da+arr") || bLower.includes("basic + da + arr")) {
          base = "% of Basic+DA+Arr. Variable DA";
          const match = colB.match(/(\d+(\.\d+)?)\s*%/);
          if (match) cleanedFormula = match[1];
        } else if (bLower.includes("basic+da") || bLower.includes("basic + da") || bLower.includes("(basic+da)")) {
          base = "% of Basic+DA";
          const match = colB.match(/(\d+(\.\d+)?)\s*%/);
          if (match) cleanedFormula = match[1];
        } else if (bLower.includes("% of basic pay") || bLower.includes("of basic pay")) {
          // CPF and PRBS are typically % of (Basic+DA) — fix wrong Excel label
          const nameLower = internalName.toLowerCase();
          if (nameLower.includes("cpf") || nameLower.includes("prbs")) {
            base = "% of Basic+DA";
          } else {
            base = "% of Basic Pay";
          }
          const match = colB.match(/(\d+(\.\d+)?)\s*%/);
          if (match) cleanedFormula = match[1];
        } else if (bLower.includes("% of balance")) {
          base = "Custom Formula";
        } else if (!isNaN(colB) && colB !== "") {
          base = "Flat Value";
          cleanedFormula = colB;
        } else if (colB !== "") {
          // Non-numeric text = custom formula (e.g. "Emplr Paid Itax/2")
          base = "Custom Formula";
        }

        newVariables.push({
          name: internalName,
          formula: cleanedFormula,
          type: currentSection,
          base: base,
          frequency: frequency,
          specificMonths: specificMonths
        });
      });
      
      if (newVariables.length > 0) {
        if (!formulaRules.variables || Array.isArray(formulaRules.variables)) {
          formulaRules.variables = { "default": defaultFormulaVariables };
        }

        // Merge into existing FY variable set (preserve entries not in the Excel sheet)
        const existing = formulaRules.variables[activeModalFy]
          ? JSON.parse(JSON.stringify(formulaRules.variables[activeModalFy]))
          : JSON.parse(JSON.stringify(formulaRules.variables["default"] || defaultFormulaVariables));

        newVariables.forEach(nv => {
          const idx = existing.findIndex(ev => ev.name === nv.name);
          if (idx >= 0) {
            existing[idx] = nv;
          } else {
            existing.push(nv);
          }
        });

        formulaRules.variables[activeModalFy] = existing;
        localStorage.setItem('formulaRulesVariables', JSON.stringify(formulaRules.variables));
        localStorage.setItem('rulesImported', 'true');

        // Build detailed import summary
        const sectionCounts = {};
        newVariables.forEach(nv => {
          sectionCounts[nv.type] = (sectionCounts[nv.type] || 0) + 1;
        });
        const summaryLines = Object.entries(sectionCounts).map(([s, c]) => `  • ${s}: ${c}`).join('\n');
        const totalAfterMerge = existing.length;
        alert(`✅ Imported ${newVariables.length} variables from Excel (FY ${activeModalFy}):\n${summaryLines}\n\nFormula table now has ${totalAfterMerge} total rules (Excel + preserved defaults).\n\nKey name fixes applied automatically:\n  • PRBS Addnl → PRBS  Addl\n  • ONGCHA mem → Association Membership\n  • ERC CPF/NPS/PRBS → erc_cpf/erc_nps/erc_prbs (internal keys)\n  • WG value adj- → WG value adjust-`);
        
        const modal = document.getElementById('formulaModal');
        if (modal && modal.classList.contains('active')) {
          renderRulesTable();
        }
        runAudit();
      } else {
        alert("No valid variables found in the uploaded Excel sheet. Please check the file format.");
      }
    } catch(err) {
      console.error(err);
      alert("Error parsing Excel file. Please ensure it is a valid Excel sheet.");
    }
  };
  reader.readAsArrayBuffer(file);
}

function renderSplitsRows(idx, splits) {
  if (splits.length === 0) {
    return `<div style="font-size: 0.75rem; color: var(--text-muted); text-align: center; padding: 0.25rem;">No splits configured. Click "Add Split Range" to start.</div>`;
  }
  
  return splits.map((s, splitIdx) => {
    let startOptions = "";
    let endOptions = "";
    monthOrder.forEach(m => {
      startOptions += `<option value="${m}" ${s.startMonth === m ? 'selected' : ''}>${m}</option>`;
      endOptions += `<option value="${m}" ${s.endMonth === m ? 'selected' : ''}>${m}</option>`;
    });
    
    return `
      <div style="display: flex; align-items: center; gap: 0.5rem; background: rgba(255,255,255,0.02); padding: 0.25rem 0.5rem; border-radius: 4px;">
        <span style="font-size: 0.75rem; color: var(--text-secondary);">Value / Formula:</span>
        <input type="text" value="${s.formula}" style="width: 100px; padding: 0.2rem; background: rgba(0,0,0,0.3); border: 1px solid var(--glass-border); color: var(--text-primary); border-radius: 4px; font-size: 0.75rem;" onchange="updateSplitFormula(${idx}, ${splitIdx}, this.value)">
        <span style="font-size: 0.75rem; color: var(--text-secondary); margin-left: 0.5rem;">From:</span>
        <select style="padding: 0.2rem; background: rgba(0,0,0,0.3); border: 1px solid var(--glass-border); color: var(--text-primary); border-radius: 4px; font-size: 0.75rem;" onchange="updateSplitStart(${idx}, ${splitIdx}, this.value)">
          ${startOptions}
        </select>
        <span style="font-size: 0.75rem; color: var(--text-secondary); margin-left: 0.5rem;">To:</span>
        <select style="padding: 0.2rem; background: rgba(0,0,0,0.3); border: 1px solid var(--glass-border); color: var(--text-primary); border-radius: 4px; font-size: 0.75rem;" onchange="updateSplitEnd(${idx}, ${splitIdx}, this.value)">
          ${endOptions}
        </select>
        <button class="btn-delete" style="font-size: 0.7rem; padding: 0.1rem 0.3rem; margin-left: auto;" onclick="deleteRuleSplit(${idx}, ${splitIdx})">×</button>
      </div>
    `;
  }).join('');
}

function renderRulesTable() {
  const tbody = document.getElementById('rulesVariablesTbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  
  const vars = getVariablesForFy(activeModalFy);
  vars.forEach((v, idx) => {
    const tr = document.createElement('tr');
    
    const freqOptions = [
      { val: "monthly", label: "Monthly" },
      { val: "quarterly", label: "Quarterly" },
      { val: "half-yearly", label: "Half Yearly" },
      { val: "yearly", label: "Yearly" },
      { val: "cummulative", label: "Cumulative" },
      { val: "specific", label: "Specific Months" }
    ];
    
    let freqSelectHtml = `<select onchange="updateRuleFreq(${idx}, this.value)">`;
    freqOptions.forEach(opt => {
      freqSelectHtml += `<option value="${opt.val}" ${v.frequency === opt.val ? 'selected' : ''}>${opt.label}</option>`;
    });
    freqSelectHtml += `</select>`;
    
    const baseOptions = [
      "Flat Value",
      "% of Basic Pay",
      "% of Basic+DA",
      "% of Basic+DA+Arr. Variable DA",
      "Custom Formula"
    ];
    let baseSelectHtml = `<select onchange="updateRuleBase(${idx}, this.value)">`;
    baseOptions.forEach(opt => {
      baseSelectHtml += `<option value="${opt}" ${v.base === opt ? 'selected' : ''}>${opt}</option>`;
    });
    baseSelectHtml += `</select>`;

    const sectionOptions = [
      "Earnings",
      "Deductions",
      "Employer Contributions",
      "Loans",
      "YTD Earnings",
      "YTD Deductions",
      "Perks",
      "Form 16"
    ];
    let secSelectHtml = `<select onchange="updateRuleSection(${idx}, this.value)">`;
    sectionOptions.forEach(opt => {
      secSelectHtml += `<option value="${opt}" ${v.type === opt ? 'selected' : ''}>${opt}</option>`;
    });
    secSelectHtml += `</select>`;

    let formulaCellHtml = "";
    if (v.isSplit) {
      formulaCellHtml = `<span style="font-size: 0.75rem; font-style: italic; color: var(--accent-cyan);">Split Durations Active</span>`;
    } else {
      formulaCellHtml = `<input type="text" value="${v.formula || '0'}" onchange="updateRuleFormula(${idx}, this.value)">`;
      if (v.formula !== undefined && v.formula !== null && v.formula.toString().trim().toLowerCase() === "x") {
        const selectedSource = v.xSourceMonth || "previous";
        const monthOptions = [
          { val: "previous", label: "Previous Month" },
          ...monthOrder.map(m => ({ val: m, label: m }))
        ];
        let selectOptions = "";
        monthOptions.forEach(opt => {
          selectOptions += `<option value="${opt.val}" ${selectedSource === opt.val ? 'selected' : ''}>${opt.label}</option>`;
        });
        formulaCellHtml += `
          <div style="margin-top: 0.25rem; font-size: 0.75rem; color: var(--accent-cyan); display: flex; align-items: center; gap: 0.25rem;">
            <span>Source:</span>
            <select onchange="updateRuleXSourceMonth(${idx}, this.value)" style="padding: 0.15rem; background: rgba(0,0,0,0.4); border: 1px solid var(--glass-border); color: var(--text-primary); border-radius: 4px; font-size: 0.75rem;">
              ${selectOptions}
            </select>
          </div>
        `;
      }
    }

    tr.innerHTML = `
      <td><input type="text" value="${v.name}" onchange="updateRuleName(${idx}, this.value)"></td>
      <td>${secSelectHtml}</td>
      <td>${baseSelectHtml}</td>
      <td>${formulaCellHtml}</td>
      <td style="text-align: center;"><input type="checkbox" ${v.isSplit ? 'checked' : ''} onchange="toggleRuleSplit(${idx}, this.checked)"></td>
      <td>${freqSelectHtml}</td>
      <td>
        <input type="text" value="${(v.specificMonths || []).join(', ')}" 
               placeholder="e.g. April, September"
               onchange="updateRuleMonths(${idx}, this.value)"
               ${v.frequency === 'specific' || v.frequency === 'quarterly' ? '' : 'disabled'}>
      </td>
      <td>
        <button class="btn-delete" onclick="deleteRuleVariable(${idx})">×</button>
      </td>
    `;
    tbody.appendChild(tr);
    
    if (v.isSplit) {
      const splitTr = document.createElement('tr');
      splitTr.innerHTML = `
        <td colspan="8" style="padding: 0.5rem 1rem 0.75rem 1rem; border-bottom: 1px solid rgba(255,255,255,0.04); background: rgba(255,255,255,0.005);">
          <div style="background: rgba(0,0,0,0.25); border: 1px solid var(--glass-border); border-radius: 6px; padding: 0.75rem; box-shadow: inset 0 2px 8px rgba(0,0,0,0.5);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
              <span style="font-size: 0.75rem; font-weight: 700; color: var(--accent-cyan); text-transform: uppercase; letter-spacing: 0.05em;">Split Duration Rules for ${v.name}</span>
              <button class="btn-add-var" style="padding: 0.15rem 0.4rem; font-size: 0.7rem; border-radius: 4px;" onclick="addRuleSplit(${idx})">＋ Add Split Range</button>
            </div>
            <div style="display: flex; flex-direction: column; gap: 0.35rem;">
              ${renderSplitsRows(idx, v.splits || [])}
            </div>
          </div>
        </td>
      `;
      tbody.appendChild(splitTr);
    }
  });
}

function updateRuleName(idx, val) {
  const vars = getVariablesForFy(activeModalFy);
  vars[idx].name = val.trim();
  localStorage.setItem('formulaRulesVariables', JSON.stringify(formulaRules.variables));
  renderRulesTable();
}
function updateRuleSection(idx, val) {
  const vars = getVariablesForFy(activeModalFy);
  vars[idx].type = val;
  localStorage.setItem('formulaRulesVariables', JSON.stringify(formulaRules.variables));
  renderRulesTable();
}
function updateRuleBase(idx, val) {
  const vars = getVariablesForFy(activeModalFy);
  vars[idx].base = val;
  localStorage.setItem('formulaRulesVariables', JSON.stringify(formulaRules.variables));
}
function updateRuleFormula(idx, val) {
  const vars = getVariablesForFy(activeModalFy);
  vars[idx].formula = val.trim();
  localStorage.setItem('formulaRulesVariables', JSON.stringify(formulaRules.variables));
  renderRulesTable();
}
function updateRuleXSourceMonth(idx, val) {
  const vars = getVariablesForFy(activeModalFy);
  vars[idx].xSourceMonth = val;
  localStorage.setItem('formulaRulesVariables', JSON.stringify(formulaRules.variables));
}
function updateRuleFreq(idx, val) {
  const vars = getVariablesForFy(activeModalFy);
  vars[idx].frequency = val;
  if (val === 'yearly') {
    vars[idx].specificMonths = ["April"];
  } else if (val === 'half-yearly') {
    vars[idx].specificMonths = ["September", "March"];
  } else if (val === 'quarterly') {
    vars[idx].specificMonths = ["April", "July", "October", "January"];
  }
  localStorage.setItem('formulaRulesVariables', JSON.stringify(formulaRules.variables));
  renderRulesTable();
}
function updateRuleMonths(idx, val) {
  const vars = getVariablesForFy(activeModalFy);
  vars[idx].specificMonths = val.split(',').map(m => m.trim()).filter(m => m);
  localStorage.setItem('formulaRulesVariables', JSON.stringify(formulaRules.variables));
}

function toggleRuleSplit(idx, checked) {
  const vars = getVariablesForFy(activeModalFy);
  vars[idx].isSplit = checked;
  if (checked && (!vars[idx].splits || vars[idx].splits.length === 0)) {
    vars[idx].splits = [
      { formula: vars[idx].formula || "0", startMonth: "April", endMonth: "September" },
      { formula: vars[idx].formula || "0", startMonth: "October", endMonth: "March" }
    ];
  }
  localStorage.setItem('formulaRulesVariables', JSON.stringify(formulaRules.variables));
  renderRulesTable();
}

function addRuleSplit(idx) {
  const vars = getVariablesForFy(activeModalFy);
  if (!vars[idx].splits) vars[idx].splits = [];
  vars[idx].splits.push({ formula: "0", startMonth: "April", endMonth: "March" });
  localStorage.setItem('formulaRulesVariables', JSON.stringify(formulaRules.variables));
  renderRulesTable();
}

function deleteRuleSplit(idx, splitIdx) {
  const vars = getVariablesForFy(activeModalFy);
  if (vars[idx].splits) {
    vars[idx].splits.splice(splitIdx, 1);
    localStorage.setItem('formulaRulesVariables', JSON.stringify(formulaRules.variables));
    renderRulesTable();
  }
}

function updateSplitFormula(idx, splitIdx, val) {
  const vars = getVariablesForFy(activeModalFy);
  if (vars[idx].splits && vars[idx].splits[splitIdx]) {
    vars[idx].splits[splitIdx].formula = val.trim();
    localStorage.setItem('formulaRulesVariables', JSON.stringify(formulaRules.variables));
  }
}

function updateSplitStart(idx, splitIdx, val) {
  const vars = getVariablesForFy(activeModalFy);
  if (vars[idx].splits && vars[idx].splits[splitIdx]) {
    vars[idx].splits[splitIdx].startMonth = val;
    localStorage.setItem('formulaRulesVariables', JSON.stringify(formulaRules.variables));
  }
}

function updateSplitEnd(idx, splitIdx, val) {
  const vars = getVariablesForFy(activeModalFy);
  if (vars[idx].splits && vars[idx].splits[splitIdx]) {
    vars[idx].splits[splitIdx].endMonth = val;
    localStorage.setItem('formulaRulesVariables', JSON.stringify(formulaRules.variables));
  }
}

function addNewRuleVariable() {
  const vars = getVariablesForFy(activeModalFy);
  vars.push({
    name: "New Component",
    formula: "0",
    type: "Earnings",
    base: "Flat Value",
    frequency: "monthly",
    specificMonths: []
  });
  localStorage.setItem('formulaRulesVariables', JSON.stringify(formulaRules.variables));
  renderRulesTable();
}

function deleteRuleVariable(idx) {
  const vars = getVariablesForFy(activeModalFy);
  vars.splice(idx, 1);
  localStorage.setItem('formulaRulesVariables', JSON.stringify(formulaRules.variables));
  renderRulesTable();
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// View Switching
function switchView(viewId) {
  // Update nav buttons
  const navBtns = document.querySelectorAll('.nav-btn');
  navBtns.forEach(btn => {
    btn.classList.remove('active');
    if (btn.innerText.toLowerCase().includes(viewId)) {
      btn.classList.add('active');
    }
  });

  // Update sections
  const sections = document.querySelectorAll('.view-section');
  sections.forEach(sec => {
    sec.classList.remove('active');
  });
  document.getElementById(`${viewId}-view`).classList.add('active');

  // Specific triggers
  if (viewId === 'dashboard') {
    updateDashboard();
  } else if (viewId === 'spreadsheet') {
    renderSpreadsheet();
  } else if (viewId === 'verification') {
    runAudit();
  }
}

// Populate Year selectors
function populateYearSelectors() {
  const fySelector = document.getElementById('fySelector');
  const verFySelector = document.getElementById('verFySelector');
  const dashFySelector = document.getElementById('dashFySelector');
  
  if (fySelector) fySelector.innerHTML = '';
  if (verFySelector) verFySelector.innerHTML = '';
  if (dashFySelector) dashFySelector.innerHTML = '';
  
  const years = Object.keys(salaryDb).sort().reverse(); // Show latest first
  years.forEach(year => {
    if (fySelector) {
      const opt = document.createElement('option');
      opt.value = year;
      opt.innerText = `FY ${year}`;
      fySelector.appendChild(opt);
    }
    
    if (verFySelector) {
      const opt2 = document.createElement('option');
      opt2.value = year;
      opt2.innerText = `FY ${year}`;
      verFySelector.appendChild(opt2);
    }

    if (dashFySelector) {
      const opt3 = document.createElement('option');
      opt3.value = year;
      opt3.innerText = `FY ${year}`;
      dashFySelector.appendChild(opt3);
    }
  });
}

// Format Currency
function formatINR(val) {
  if (val === undefined || val === null || isNaN(val)) return '₹0.00';
  return '₹' + Number(val).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// Clean / Format Number output
function formatNumber(val) {
  if (val === undefined || val === null || isNaN(val)) return '0.00';
  return Number(val).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// KPI Dashboard Updates
let trendChart = null;
let allocationChart = null;
let deductionChart = null;
let employerChart = null;

function changeDashFy(fy) {
  syncYearSelectors(fy);
  updateDashboard();
  renderSpreadsheet();
  runAudit();
}

function syncYearSelectors(fy) {
  selectedYear = fy;
  const ids = ['fySelector', 'verFySelector', 'dashFySelector'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = fy;
  });
}

function updateDashboard() {
  let totalNet = 0;
  let totalGross = 0;
  let totalDed = 0;
  let count = 0;

  // Scan selectedYear slips
  const yearData = salaryDb[selectedYear] || {};
  
  monthOrder.forEach(m => {
    const slip = yearData[m];
    if (slip) {
      totalNet += slip.totals.net_pay || 0;
      totalGross += slip.totals.tot_earn || 0;
      totalDed += slip.totals.tot_dedn || 0;
      count++;
    }
  });

  const avgNet = count > 0 ? totalNet / count : 0;

  document.getElementById('kpiNetPay').innerText = formatINR(avgNet);
  document.getElementById('kpiGrossPay').innerText = formatINR(totalGross);
  document.getElementById('kpiDeductions').innerText = formatINR(totalDed);

  document.getElementById('kpiGrossPeriod').innerText = `FY ${selectedYear} (${count} Months)`;

  // --- 1. YoY CALCULATIONS ---
  let hasYoY = false;
  let netYoYPct = 0;
  let grossYoYPct = 0;

  const currentYearParts = selectedYear.split('-');
  if (currentYearParts.length === 2) {
    const currStartYear = parseInt(currentYearParts[0]);
    const prevStartYear = currStartYear - 1;
    const prevEndYear = (prevStartYear + 1) % 100;
    const prevYearStr = `${prevStartYear}-${prevEndYear.toString().padStart(2, '0')}`;
    
    const prevYearData = salaryDb[prevYearStr];
    if (prevYearData) {
      let prevNetSum = 0;
      let prevNetCount = 0;
      let prevGrossSum = 0;
      let correspondingMonthsCount = 0;
      
      monthOrder.forEach(m => {
        const prevSlip = prevYearData[m];
        if (prevSlip) {
          prevNetSum += prevSlip.totals.net_pay || 0;
          prevNetCount++;
          
          if (yearData[m]) {
            prevGrossSum += prevSlip.totals.tot_earn || 0;
            correspondingMonthsCount++;
          }
        }
      });
      
      const prevAvgNet = prevNetCount > 0 ? prevNetSum / prevNetCount : 0;
      
      if (correspondingMonthsCount === 0 && prevNetCount > 0) {
        monthOrder.forEach(m => {
          const prevSlip = prevYearData[m];
          if (prevSlip) {
            prevGrossSum += prevSlip.totals.tot_earn || 0;
          }
        });
      }
      
      if (prevAvgNet > 0) {
        netYoYPct = ((avgNet - prevAvgNet) / prevAvgNet) * 100;
        hasYoY = true;
      }
      if (prevGrossSum > 0) {
        grossYoYPct = ((totalGross - prevGrossSum) / prevGrossSum) * 100;
        hasYoY = true;
      }
    }
  }

  const netBadge = document.getElementById('kpiNetYoY');
  const grossBadge = document.getElementById('kpiGrossYoY');
  
  if (hasYoY) {
    netBadge.style.display = 'inline-flex';
    netBadge.className = 'yoy-badge ' + (netYoYPct >= 0 ? 'positive' : 'negative');
    netBadge.innerText = (netYoYPct >= 0 ? '+' : '') + netYoYPct.toFixed(1) + '% YoY';
    
    grossBadge.style.display = 'inline-flex';
    grossBadge.className = 'yoy-badge ' + (grossYoYPct >= 0 ? 'positive' : 'negative');
    grossBadge.innerText = (grossYoYPct >= 0 ? '+' : '') + grossYoYPct.toFixed(1) + '% YoY';
  } else {
    netBadge.style.display = 'none';
    grossBadge.style.display = 'none';
  }

  // --- 2. SALARY COMPONENT BREAKDOWN CHART ---
  let basicSum = 0;
  let daSum = 0;
  let cafeteriaSum = 0;
  let hraSum = 0;
  let prpSum = 0;
  let perksSum = 0;
  
  // Deductions
  let taxSum = 0;
  let retirementSum = 0;
  let loanSum = 0;
  let otherDedSum = 0;

  // Employer Contributions
  let ercCpfSum = 0;
  let ercNpsSum = 0;
  let ercPrbsSum = 0;
  let ercCsssSum = 0;
  let ercEpsSum = 0;
  
  monthOrder.forEach(m => {
    const slip = yearData[m];
    if (slip) {
      const earnings = slip.earnings || {};
      for (const key in earnings) {
        const val = earnings[key] || 0;
        const keyLower = key.toLowerCase();
        
        if (keyLower === "basic pay" || keyLower.includes("arr.basic")) {
          basicSum += val;
        } else if (keyLower.includes("variable da") || keyLower.includes("var da") || keyLower.includes("arr.variable da")) {
          daSum += val;
        } else if (
          keyLower.includes("cafeteria") || 
          keyLower.includes("lfa") || 
          keyLower.includes("caf")
        ) {
          cafeteriaSum += val;
        } else if (keyLower.includes("house rent") || keyLower.includes("hra") || keyLower.includes("hr allowance")) {
          hraSum += val;
        } else if (keyLower.includes("prp") || keyLower.includes("performance")) {
          prpSum += val;
        } else {
          perksSum += val;
        }
      }
      
      const deductions = slip.deductions || {};
      for (const key in deductions) {
        const val = deductions[key] || 0;
        const keyLower = key.toLowerCase();
        
        if (keyLower.includes("income tax") || keyLower === "i. tax" || keyLower === "tax") {
          taxSum += val;
        } else if (
          keyLower.includes("cpf") || 
          keyLower.includes("nps") || 
          keyLower.includes("prbs") || 
          keyLower.includes("css") || 
          keyLower.includes("sahyog") ||
          keyLower.includes("pf")
        ) {
          retirementSum += val;
        } else if (
          keyLower.includes("car") || 
          keyLower.includes("4 wh") || 
          keyLower.includes("loan") ||
          keyLower.includes("recovery") ||
          keyLower.includes("recov") ||
          keyLower.includes("rent") ||
          keyLower.includes("rec.") ||
          keyLower.includes("rec ")
        ) {
          loanSum += val;
        } else {
          otherDedSum += val;
        }
      }

      if (slip.metadata) {
        ercCpfSum += slip.metadata.erc_cpf || 0;
        ercNpsSum += slip.metadata.erc_nps || 0;
        ercPrbsSum += slip.metadata.erc_prbs || 0;
        ercCsssSum += slip.metadata.erc_csss || 0;
        ercEpsSum += slip.metadata.erc_eps || 0;
      }
    }
  });

  renderAllocationChart(basicSum, daSum, cafeteriaSum, hraSum, prpSum, perksSum);
  renderDeductionChart(taxSum, retirementSum, loanSum, otherDedSum);
  renderEmployerChart(ercCpfSum, ercNpsSum, ercPrbsSum, ercCsssSum, ercEpsSum);

  // --- 3. CAR LOAN REPAYMENT PROGRESS ---
  let activeLoanSlip = null;
  let activeLoanMonth = "";
  let activeLoanYear = "";
  monthOrder.forEach(m => {
    const slip = yearData[m];
    if (slip && slip.loans && slip.loans["Car/4 Wheeler"]) {
      activeLoanSlip = slip.loans["Car/4 Wheeler"];
      activeLoanMonth = m;
      activeLoanYear = slip.metadata.year;
    }
  });
  
  if (!activeLoanSlip) {
    Object.keys(salaryDb).sort().forEach(fy => {
      monthOrder.forEach(m => {
        const slip = salaryDb[fy][m];
        if (slip && slip.loans && slip.loans["Car/4 Wheeler"]) {
          activeLoanSlip = slip.loans["Car/4 Wheeler"];
          activeLoanMonth = m;
          activeLoanYear = slip.metadata.year;
        }
      });
    });
  }

  let loanBalance = 0;
  let loanInstallment = 0;
  let loanInterest = 0;
  let loanPaid = 0;
  let loanRemaining = 0;
  let loanProgressPct = 0;
  let termText = "0 months (0.0 yrs)";
  let payoffDateText = "N/A";
  let rateText = "N/A";
  let repaymentType = "N/A";
  
  // Dynamically calculate the interest rate and repayment type from the historical data
  let calculatedRate = null;
  let prevRecord = null;
  const chronologicalYears = Object.keys(salaryDb).sort();
  
  chronologicalYears.forEach(fy => {
    monthOrder.forEach(m => {
      const slip = salaryDb[fy][m];
      if (slip && slip.loans && slip.loans["Car/4 Wheeler"]) {
        const currLoan = slip.loans["Car/4 Wheeler"];
        if (prevRecord) {
          const deltaInt = (currLoan.accrued_interest || 0) - (prevRecord.accrued_interest || 0);
          const prevBal = prevRecord.balance || 0;
          if (deltaInt > 0 && prevBal > 0) {
            const annualRate = (deltaInt / prevBal) * 12;
            calculatedRate = Math.round(annualRate * 1000) / 10; // e.g. 4.0
          }
        }
        prevRecord = currLoan;
      }
    });
  });

  if (activeLoanSlip) {
    const placeholderEl = document.getElementById('loanWidgetPlaceholder');
    const contentEl = document.getElementById('loanWidgetContent');
    if (placeholderEl) placeholderEl.style.display = 'none';
    if (contentEl) contentEl.style.display = 'flex';

    loanBalance = activeLoanSlip.balance || 0;
    loanInstallment = activeLoanSlip.installment || 0;
    loanInterest = activeLoanSlip.accrued_interest || 0;
    
    const principal = Math.max(750000, Math.ceil(loanBalance / 50000) * 50000);
    loanRemaining = loanBalance;
    loanPaid = Math.max(0, principal - loanBalance);
    loanProgressPct = (loanPaid / principal) * 100;

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const startMonthIdx = monthNames.indexOf(activeLoanMonth);
    const startYear = parseInt(activeLoanYear);

    if (loanRemaining > 0 && loanInstallment > 0 && startMonthIdx !== -1 && !isNaN(startYear)) {
      const remainingMonths = Math.ceil(loanRemaining / loanInstallment);
      termText = `${remainingMonths} months (${(remainingMonths / 12).toFixed(1)} yrs)`;
      
      let payoffMonthIdx = (startMonthIdx + remainingMonths) % 12;
      let payoffYear = startYear + Math.floor((startMonthIdx + remainingMonths) / 12);
      
      payoffDateText = `${monthNames[payoffMonthIdx]} ${payoffYear}`;
    } else if (loanRemaining === 0) {
      termText = "0 months (0.0 yrs)";
      payoffDateText = "Paid Off";
    }

    if (calculatedRate !== null) {
      rateText = `${calculatedRate.toFixed(1)}% p.a. (Simple Reducing)`;
    } else {
      rateText = "4.0% p.a. (Simple Reducing)";
    }

    if (loanInterest > 0 && loanPaid > 0) {
      repaymentType = "Principal First, Interest Later";
    } else {
      repaymentType = "Simple Reducing Balance";
    }
  } else {
    const placeholderEl = document.getElementById('loanWidgetPlaceholder');
    const contentEl = document.getElementById('loanWidgetContent');
    if (placeholderEl) placeholderEl.style.display = 'block';
    if (contentEl) contentEl.style.display = 'none';
  }

  document.getElementById('kpiLoanBal').innerText = formatINR(loanBalance);
  document.getElementById('kpiLoanInstl').innerText = `Installment: ${formatINR(loanInstallment)}/mo`;

  document.getElementById('loanProgressPercent').innerText = `${loanProgressPct.toFixed(1)}%`;
  document.getElementById('loanProgressBar').style.width = `${loanProgressPct}%`;
  document.getElementById('loanPaidAmt').innerText = formatINR(loanPaid);
  document.getElementById('loanRemAmt').innerText = formatINR(loanRemaining);
  document.getElementById('loanInstlText').innerText = formatINR(loanInstallment);
  document.getElementById('loanIntText').innerText = formatINR(loanInterest);
  
  const rateEl = document.getElementById('loanRateText');
  if (rateEl) rateEl.innerText = rateText;
  const typeEl = document.getElementById('loanTypeText');
  if (typeEl) typeEl.innerText = repaymentType;
  const termEl = document.getElementById('loanTermText');
  if (termEl) termEl.innerText = termText;
  const payoffEl = document.getElementById('loanPayoffText');
  if (payoffEl) payoffEl.innerText = payoffDateText;

  // --- 4. INCOME TAX ESTIMATOR ---
  let latestSlip = null;
  for (let i = monthOrder.length - 1; i >= 0; i--) {
    const m = monthOrder[i];
    if (yearData[m]) {
      latestSlip = yearData[m];
      break;
    }
  }

  let annualGross = 0;
  if (latestSlip && latestSlip.form16 && latestSlip.form16["Gross Sal"] > 0) {
    annualGross = latestSlip.form16["Gross Sal"];
  } else if (count > 0) {
    annualGross = (totalGross / count) * 12;
  }

  const stdDeduction = 75000;
  const netTaxable = Math.max(0, annualGross - stdDeduction);

  let estimatedTax = 0;
  let slabRateText = "0%";

  if (netTaxable <= 700000) {
    estimatedTax = 0;
    slabRateText = "0% (Rebate)";
  } else {
    let tax = 0;
    if (netTaxable > 300000) {
      tax += Math.min(netTaxable - 300000, 400000) * 0.05;
    }
    if (netTaxable > 700000) {
      tax += Math.min(netTaxable - 700000, 300000) * 0.10;
    }
    if (netTaxable > 1000000) {
      tax += Math.min(netTaxable - 1000000, 200000) * 0.15;
    }
    if (netTaxable > 1200000) {
      tax += Math.min(netTaxable - 1200000, 300000) * 0.20;
    }
    if (netTaxable > 1500000) {
      tax += (netTaxable - 1500000) * 0.30;
    }
    
    estimatedTax = tax * 1.04;
    
    if (netTaxable > 1500000) slabRateText = "30%";
    else if (netTaxable > 1200000) slabRateText = "20%";
    else if (netTaxable > 1000000) slabRateText = "15%";
    else if (netTaxable > 700000) slabRateText = "10%";
    else slabRateText = "5%";
  }

  // Calculate actual cumulative tax paid in the selected FY
  let cumulativeTaxPaid = 0;
  monthOrder.forEach(m => {
    const slip = yearData[m];
    if (slip) {
      const deductions = slip.deductions || {};
      for (const key in deductions) {
        const val = deductions[key] || 0;
        const keyLower = key.toLowerCase();
        if (keyLower.includes("income tax") || keyLower === "i. tax" || keyLower === "tax") {
          cumulativeTaxPaid += val;
        }
      }
    }
  });

  const remainingTax = Math.max(0, estimatedTax - cumulativeTaxPaid);

  document.getElementById('taxGrossText').innerText = formatINR(annualGross);
  document.getElementById('taxNetText').innerText = formatINR(netTaxable);
  document.getElementById('taxSlabText').innerText = slabRateText;
  document.getElementById('taxPaidYtdText').innerText = formatINR(cumulativeTaxPaid);
  document.getElementById('taxRemainingText').innerText = formatINR(remainingTax);
  document.getElementById('taxAnnualText').innerText = formatINR(estimatedTax);

  // --- 5. EMERGENCY / PENSION CORPUS PROJECTION ---

  // Avg monthly contributions from selected FY
  let totalCpfOwn = 0, totalCpfOrg = 0;
  let totalNpsOwn = 0, totalNpsOrg = 0;
  let totalPrbsOwn = 0, totalPrbsOrg = 0;
  let contributionCount = 0;

  monthOrder.forEach(m => {
    const slip = yearData[m];
    if (slip) {
      // CPF: Employee deduction + Employer contribution
      totalCpfOwn += (slip.deductions && slip.deductions["CPF EEC"]) || 0;
      totalCpfOrg += (slip.metadata && slip.metadata.erc_cpf) || 0;
      // NPS: Employee deduction + Employer contribution
      totalNpsOwn += (slip.deductions && slip.deductions["NPS EEC"]) || 0;
      totalNpsOrg += (slip.metadata && slip.metadata.erc_nps) || 0;
      // PRBS: Employee 3% contrib + PRBS Addl (flat) + Employer PRBS contrib
      totalPrbsOwn += (slip.deductions && slip.deductions["Emp PRBS contrib"]) || 0;
      totalPrbsOwn += (slip.deductions && slip.deductions["PRBS  Addl"]) || 0;
      totalPrbsOrg += (slip.metadata && slip.metadata.erc_prbs) || 0;
      contributionCount++;
    }
  });

  const avgMonthlyCpf  = contributionCount > 0 ? (totalCpfOwn  + totalCpfOrg)  / contributionCount : 0;
  const avgMonthlyNps  = contributionCount > 0 ? (totalNpsOwn  + totalNpsOrg)  / contributionCount : 0;
  const avgMonthlyPrbs = contributionCount > 0 ? (totalPrbsOwn + totalPrbsOrg) / contributionCount : 0;
  const totalMonthlyRetirement = avgMonthlyCpf + avgMonthlyNps + avgMonthlyPrbs;

  // Cumulative accrued across ALL uploaded FYs + Historical data from 2018-2022
  // Historical totals: CPF = 755694.0, NPS = 44997.0, PRBS = 1004288.0
  let overallCpfAccrued = 755694.0;
  let overallNpsAccrued = 44997.0;
  let overallPrbsAccrued = 1004288.0;

  Object.keys(salaryDb).forEach(fy => {
    monthOrder.forEach(m => {
      const slip = salaryDb[fy] && salaryDb[fy][m];
      if (slip) {
        overallCpfAccrued  += (slip.deductions && slip.deductions["CPF EEC"]) || 0;
        overallCpfAccrued  += (slip.metadata && slip.metadata.erc_cpf) || 0;
        overallNpsAccrued  += (slip.deductions && slip.deductions["NPS EEC"]) || 0;
        overallNpsAccrued  += (slip.metadata && slip.metadata.erc_nps) || 0;
        overallPrbsAccrued += (slip.deductions && slip.deductions["Emp PRBS contrib"]) || 0;
        overallPrbsAccrued += (slip.deductions && slip.deductions["PRBS  Addl"]) || 0;
        overallPrbsAccrued += (slip.metadata && slip.metadata.erc_prbs) || 0;
      }
    });
  });
  const totalAccruedVal = overallCpfAccrued + overallNpsAccrued + overallPrbsAccrued;

  // Accurate age using today's actual real-world date (not the slip's year)
  let currentAge = 32; // fallback default
  let foundDob = null;
  const sortedFys = Object.keys(salaryDb).sort();
  outerDobSearch:
  for (const fy of sortedFys) {
    for (const m of monthOrder) {
      const s = salaryDb[fy] && salaryDb[fy][m];
      if (s && s.metadata && s.metadata.dob) {
        foundDob = s.metadata.dob;
        break outerDobSearch;
      }
    }
  }
  if (foundDob) {
    const parts = foundDob.split('.');
    if (parts.length === 3) {
      const bDay   = parseInt(parts[0]);
      const bMonth = parseInt(parts[1]) - 1; // JS Date months: 0-indexed
      const bYear  = parseInt(parts[2]);
      const today  = new Date();
      let age = today.getFullYear() - bYear;
      // Subtract 1 if birthday hasn't occurred yet this year
      if (today.getMonth() < bMonth || (today.getMonth() === bMonth && today.getDate() < bDay)) {
        age--;
      }
      if (!isNaN(age) && age > 0 && age < 80) currentAge = age;
    }
  }

  // Short FY label: "2025-26" → "FY 25-26"
  const fyParts = selectedYear.split('-');
  const fyShort = fyParts.length === 2
    ? `FY ${fyParts[0].slice(2)}-${fyParts[1]}`
    : `FY ${selectedYear}`;

  // Update monthly contribution labels
  const labelCpf  = document.getElementById('labelMonthlyCpf');
  const labelNps  = document.getElementById('labelMonthlyNps');
  const labelPrbs = document.getElementById('labelMonthlyPrbs');
  if (labelCpf)  labelCpf.innerText  = `Monthly CPF (Emp + Empr) — ${fyShort}:`;
  if (labelNps)  labelNps.innerText  = `Monthly NPS (Emp + Empr) — ${fyShort}:`;
  if (labelPrbs) labelPrbs.innerText = `Monthly PRBS (Emp + Empr) — ${fyShort}:`;

  document.getElementById('projMonthlyCpf').innerText = formatINR(avgMonthlyCpf);
  document.getElementById('projMonthlyNps').innerText = formatINR(avgMonthlyNps);
  const prbsMonthlyEl = document.getElementById('projMonthlyPrbs');
  if (prbsMonthlyEl) prbsMonthlyEl.innerText = formatINR(avgMonthlyPrbs);

  // Cumulative values
  const accruedCpfEl   = document.getElementById('projAccruedCpf');
  const accruedNpsEl   = document.getElementById('projAccruedNps');
  const accruedPrbsEl  = document.getElementById('projAccruedPrbs');
  const totalAccruedEl = document.getElementById('projTotalAccrued');
  if (accruedCpfEl)   accruedCpfEl.innerText   = formatINR(overallCpfAccrued);
  if (accruedNpsEl)   accruedNpsEl.innerText   = formatINR(overallNpsAccrued);
  if (accruedPrbsEl)  accruedPrbsEl.innerText  = formatINR(overallPrbsAccrued);
  if (totalAccruedEl) totalAccruedEl.innerText = formatINR(totalAccruedVal);

  // Future Value with annual contribution growth (3% standard, 6% in multiples of 5 from joining in 2018)
  const calculateEscalatedFutureValue = (pv, startPmt, annualRate, years) => {
    const r = annualRate / 12;
    let currentCorpus = pv;
    let currentPmt = startPmt;
    const currentYear = new Date().getFullYear();
    const joiningYear = 2018;

    for (let k = 1; k <= years; k++) {
      const projYear = currentYear + k;
      const yearsSinceJoining = projYear - joiningYear;
      
      // Increment monthly contribution at the start of the year
      const growthRate = (yearsSinceJoining % 5 === 0) ? 0.06 : 0.03;
      currentPmt = currentPmt * (1 + growthRate);

      // Accumulate over 12 months for this year
      if (r === 0) {
        currentCorpus = currentCorpus + currentPmt * 12;
      } else {
        const factor = Math.pow(1 + r, 12);
        currentCorpus = currentCorpus * factor + currentPmt * ((factor - 1) / r);
      }
    }
    return currentCorpus;
  };

  const blendedRate = 0.08; // Blended 8% p.a. (CPF 8.15% + NPS ~10-11% + PRBS ~7.5%)
  const targetAges = [40, 50, 60];
  targetAges.forEach(age => {
    const labelEl = document.getElementById(`labelWealth${age}`);
    const valEl   = document.getElementById(`projWealth${age}`);
    if (!labelEl || !valEl) return;

    if (age > currentAge) {
      const yearsRemaining = age - currentAge;
      const fv = calculateEscalatedFutureValue(totalAccruedVal, totalMonthlyRetirement, blendedRate, yearsRemaining);
      labelEl.innerText = `At Age ${age} (in ${yearsRemaining} Yrs):`;
      valEl.innerText   = formatINR(fv);
    } else {
      labelEl.innerText = `At Age ${age} (Reached):`;
      valEl.innerText   = 'N/A';
    }
  });

  // Redraw Trend Chart
  renderTrendChart();
}

function populateCustomLegend(elementId, labels, colors, data) {
  const legendEl = document.getElementById(elementId);
  if (!legendEl) return;
  legendEl.innerHTML = '';
  
  const total = data.reduce((a, b) => a + b, 0);
  
  labels.forEach((label, idx) => {
    const val = data[idx];
    const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0';
    
    const item = document.createElement('div');
    item.className = 'legend-item';
    item.innerHTML = `
      <span class="legend-color" style="background-color: ${colors[idx]}"></span>
      <span>${label} (${pct}%)</span>
    `;
    legendEl.appendChild(item);
  });
}

function renderAllocationChart(basic, da, cafeteria, hra, prp, perks) {
  const canvas = document.getElementById('salaryAllocationChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  if (allocationChart) {
    allocationChart.destroy();
  }

  const total = basic + da + cafeteria + hra + prp + perks;
  const colors = [
    '#3b82f6', // Basic Pay (Blue)
    '#06b6d4', // Variable DA (Cyan)
    '#f97316', // Cafeteria & LFA (Orange)
    '#10b981', // HRA (Green)
    '#a855f7', // PRP (Purple)
    '#ec4899'  // Perks & Allowances (Pink)
  ];
  const labels = ['Basic Pay', 'Variable DA', 'Cafeteria & LFA', 'HRA', 'PRP / PRP Advance', 'Other Perks & Allowances'];
  const values = [basic, da, cafeteria, hra, prp, perks];

  allocationChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const val = context.raw;
              const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0';
              return ` ${context.label}: ${formatINR(val)} (${pct}%)`;
            }
          }
        }
      },
      cutout: '70%'
    }
  });

  populateCustomLegend('earningsLegend', labels, colors, values);
}

function renderDeductionChart(tax, retirement, loan, other) {
  const canvas = document.getElementById('salaryDeductionChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  if (deductionChart) {
    deductionChart.destroy();
  }

  const total = tax + retirement + loan + other;
  const colors = [
    '#ef4444', // Income Tax (Red)
    '#6366f1', // Employee's Contribution (Indigo)
    '#f59e0b', // Car Loan (Amber)
    '#64748b'  // Other Deductions (Slate)
  ];
  const labels = ['Income Tax', 'Employee\'s Contribution (CPF/NPS)', 'Car Loan', 'Other Deductions'];
  const values = [tax, retirement, loan, other];

  deductionChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const val = context.raw;
              const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0';
              return ` ${context.label}: ${formatINR(val)} (${pct}%)`;
            }
          }
        }
      },
      cutout: '70%'
    }
  });

  populateCustomLegend('deductionsLegend', labels, colors, values);
}

function renderEmployerChart(cpf, nps, prbs, csss, eps) {
  const canvas = document.getElementById('salaryEmployerChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  if (employerChart) {
    employerChart.destroy();
  }

  const total = cpf + nps + prbs + csss + eps;
  const colors = [
    '#10b981', // Employer CPF (Green)
    '#06b6d4', // Employer NPS (Cyan)
    '#3b82f6', // Employer PRBS (Blue)
    '#f97316', // Employer CSSS (Orange)
    '#64748b'  // Employer EPS (Slate)
  ];
  const labels = ['Employer CPF (erc_cpf)', 'Employer NPS (erc_nps)', 'Employer PRBS (erc_prbs)', 'Employer CSSS (erc_csss)', 'Employer EPS (erc_eps)'];
  const values = [cpf, nps, prbs, csss, eps];

  employerChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const val = context.raw;
              const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0';
              return ` ${context.label}: ${formatINR(val)} (${pct}%)`;
            }
          }
        }
      },
      cutout: '70%'
    }
  });

  populateCustomLegend('employerLegend', labels, colors, values);
}

function updateTimelineFeed() {
  const feed = document.getElementById('recentActivitiesList');
  feed.innerHTML = '';
  
  let slipsList = [];
  
  Object.keys(salaryDb).forEach(fy => {
    Object.keys(salaryDb[fy]).forEach(m => {
      const slip = salaryDb[fy][m];
      slipsList.push({
        fy: fy,
        month: m,
        netPay: slip.totals.net_pay,
        serial: slip.metadata.serial_no || 'N/A',
        file: slip.metadata.file
      });
    });
  });

  // Sort: show latest slips at the top
  // Create sort weight
  const getWeight = (item) => {
    const yr = parseInt(item.fy.split('-')[0]);
    const moIdx = monthOrder.indexOf(item.month);
    return yr * 100 + moIdx;
  };
  
  slipsList.sort((a, b) => getWeight(b) - getWeight(a));
  
  slipsList.slice(0, 10).forEach(item => {
    const div = document.createElement('div');
    div.className = 'activity-item';
    div.innerHTML = `
      <div class="activity-desc">
        <span class="activity-title">Payslip Uploaded: ${item.month} (FY ${item.fy})</span>
        <span class="activity-time">${item.file} • Serial No: ${item.serial}</span>
      </div>
      <span class="activity-badge" style="background: rgba(16, 185, 129, 0.1); color: var(--accent-green);">
        ${formatINR(item.netPay)}
      </span>
    `;
    feed.appendChild(div);
  });

  if (slipsList.length === 0) {
    feed.innerHTML = '<div style="text-align: center; color: var(--text-muted); margin-top: 2rem;">No salary slips loaded.</div>';
  }
}

// Render Historical Salary Trend Chart
function renderTrendChart() {
  const canvas = document.getElementById('salaryTrendChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  if (trendChart) {
    trendChart.destroy();
  }

  // Gather historical months chronologically
  let labels = [];
  let grossData = [];
  let netData = [];
  let dedData = [];

  const sortedYears = Object.keys(salaryDb).sort();

  sortedYears.forEach(fy => {
    monthOrder.forEach(m => {
      const slip = salaryDb[fy][m];
      if (slip) {
        labels.push(`${m.substring(0,3)} '${fy.split('-')[0].substring(2)}`);
        grossData.push(Math.round(slip.totals.tot_earn));
        netData.push(Math.round(slip.totals.net_pay));
        dedData.push(Math.round(slip.totals.tot_dedn));
      }
    });
  });

  // Dynamic Y-axis range: start 8% below the minimum value so lines fill the chart
  const allValues = [...grossData, ...netData, ...dedData].filter(v => v > 0);
  const peak    = allValues.length > 0 ? Math.max(...allValues) : 300000;
  const trough  = allValues.length > 0 ? Math.min(...allValues) : 0;
  // Round yMax UP: 5% buffer above peak, then round to nearest ₹10,000
  const yMax    = Math.ceil(peak * 1.05 / 10000) * 10000;
  // Round yMin DOWN to nearest ₹5,000 with 8% headroom below trough
  const yMin    = Math.floor(trough * 0.92 / 5000) * 5000;
  // Compute a step size that divides the range into ~10 equal parts, rounded to ₹5,000
  const rawStep = (yMax - yMin) / 10;
  const stepSize = Math.ceil(rawStep / 5000) * 5000;

  // Format Y-axis ticks as ₹X.XL
  const formatLakh = (val) => {
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    if (val >= 1000)   return `₹${(val / 1000).toFixed(0)}K`;
    return `₹${val}`;
  };

  // Gradient fill under Gross line
  const gradientGross = ctx.createLinearGradient(0, 0, 0, 310);
  gradientGross.addColorStop(0, 'rgba(6, 182, 212, 0.18)');
  gradientGross.addColorStop(1, 'rgba(6, 182, 212, 0.00)');

  const gradientNet = ctx.createLinearGradient(0, 0, 0, 310);
  gradientNet.addColorStop(0, 'rgba(16, 185, 129, 0.14)');
  gradientNet.addColorStop(1, 'rgba(16, 185, 129, 0.00)');

  trendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Gross Salary',
          data: grossData,
          borderColor: '#06b6d4',
          backgroundColor: gradientGross,
          borderWidth: 2.5,
          tension: 0.4,
          fill: true,
          pointRadius: 2,
          pointHoverRadius: 6,
          pointBackgroundColor: '#06b6d4',
          pointBorderColor: '#06b6d4',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: '#06b6d4',
          pointHoverBorderWidth: 2
        },
        {
          label: 'Net Pay',
          data: netData,
          borderColor: '#10b981',
          backgroundColor: gradientNet,
          borderWidth: 2.5,
          tension: 0.4,
          fill: true,
          pointRadius: 2,
          pointHoverRadius: 6,
          pointBackgroundColor: '#10b981',
          pointBorderColor: '#10b981',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: '#10b981',
          pointHoverBorderWidth: 2
        },
        {
          label: 'Deductions',
          data: dedData,
          borderColor: '#f43f5e',
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          tension: 0.4,
          borderDash: [5, 4],
          fill: false,
          pointRadius: 1.5,
          pointHoverRadius: 5,
          pointBackgroundColor: '#f43f5e',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: '#f43f5e',
          pointHoverBorderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          position: 'top',
          align: 'end',
          labels: {
            color: '#94a3b8',
            font: { family: 'Outfit', size: 11 },
            boxWidth: 12,
            boxHeight: 3,
            padding: 16,
            usePointStyle: true,
            pointStyle: 'line'
          }
        },
        tooltip: {
          backgroundColor: 'rgba(10, 14, 30, 0.92)',
          titleColor: '#f8fafc',
          bodyColor: '#94a3b8',
          borderColor: 'rgba(255,255,255,0.08)',
          borderWidth: 1,
          padding: 12,
          titleFont: { family: 'Outfit', size: 12, weight: '600' },
          bodyFont: { family: 'Outfit', size: 11 },
          callbacks: {
            title: (items) => items[0].label,
            label: (context) => {
              const label = context.dataset.label || '';
              const value = formatINR(context.parsed.y);
              return `  ${label}: ${value}`;
            },
            afterBody: (items) => {
              if (items.length >= 2) {
                const gross = items[0]?.parsed?.y || 0;
                const net   = items[1]?.parsed?.y || 0;
                if (gross > 0) {
                  const eff = ((net / gross) * 100).toFixed(1);
                  return [``, `  Take-home rate: ${eff}%`];
                }
              }
              return [];
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.04)', drawTicks: false },
          border: { color: 'rgba(255,255,255,0.06)' },
          ticks: {
            color: '#64748b',
            font: { family: 'Outfit', size: 10 },
            maxRotation: 45,
            minRotation: 30,
            autoSkip: true,
            maxTicksLimit: 18
          }
        },
        y: {
          min: yMin,
          max: yMax,
          grid: { color: 'rgba(255,255,255,0.05)', drawTicks: false },
          border: { color: 'rgba(255,255,255,0.06)', dash: [3, 3] },
          ticks: {
            color: '#64748b',
            font: { family: 'Outfit', size: 10 },
            stepSize: stepSize,
            callback: (val) => formatLakh(val)
          }
        }
      }
    }
  });
}


// Master Spreadsheet View
function renderSpreadsheet() {
  const val = document.getElementById('fySelector').value;
  syncYearSelectors(val);
  const table = document.getElementById('spreadsheetTable');
  if (!table) return;

  const yearData = salaryDb[selectedYear] || {};

  // 1. Gather all unique row keys for Earnings, Deductions, YTD, Perks, Form 16, and Loans
  let earnKeysSet = new Set();
  let dedKeysSet = new Set();
  let ercKeysSet = new Set();
  let ytdEarnKeysSet = new Set();
  let ytdDedKeysSet = new Set();
  let perkKeysSet = new Set();
  let f16KeysSet = new Set();
  let loanKeysSet = new Set();

  monthOrder.forEach(m => {
    const slip = yearData[m];
    if (slip) {
      if (slip.earnings) Object.keys(slip.earnings).forEach(k => earnKeysSet.add(k));
      if (slip.deductions) Object.keys(slip.deductions).forEach(k => dedKeysSet.add(k));
      if (slip.loans) Object.keys(slip.loans).forEach(k => loanKeysSet.add(k));
      if (slip.ytd_earnings) Object.keys(slip.ytd_earnings).forEach(k => ytdEarnKeysSet.add(k));
      if (slip.ytd_deductions) Object.keys(slip.ytd_deductions).forEach(k => ytdDedKeysSet.add(k));
      if (slip.perks) Object.keys(slip.perks).forEach(k => perkKeysSet.add(k));
      if (slip.form16) Object.keys(slip.form16).forEach(k => f16KeysSet.add(k));
      
      Object.keys(slip.metadata).forEach(k => {
        if (k.startsWith('erc_')) {
          ercKeysSet.add(k);
        }
      });
    }
  });

  // Standardize row ordering
  const priorityEarn = ["Basic Pay", "Other Cafeteria", "Cafeteria Adj-HP", "Variable DA", "House Rent Allow", "LFA Allowance-Ca", "CMRE", "Maint charge WG", "Uniform Reimb", "WG value adjust-"];
  const earnKeys = Array.from(earnKeysSet).sort((a, b) => {
    const idxA = priorityEarn.indexOf(a);
    const idxB = priorityEarn.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });

  const priorityDed = ["CPF EEC", "Income Tax", "Prof Tax", "Emplyr paid ITax", "NPS EEC", "CSS Scheme", "Emp PRBS contrib", "PRBS  Addl", "ASTO Rec", "Association Membership", "ONGCHA Membershi", "C&T Scty I", "Officers' Club", "HCMRS Ins Scheme", "WG Rent", "White goods Rent", "Bachelor Accom", "Coin Adjus", "Sahyog Fund", "ONGC Sahyog Fund"];
  const dedKeys = Array.from(dedKeysSet).sort((a, b) => {
    const idxA = priorityDed.indexOf(a);
    const idxB = priorityDed.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });

  const ercDisplayNames = {
    "erc_cpf": "ERC CPF Contribution",
    "erc_prbs": "ERC PRBS Contribution",
    "erc_csss": "ERC CSSS Contribution",
    "erc_nps": "ERC NPS Contribution",
    "erc_eps": "ERC EPS Contribution"
  };
  const ercKeys = Array.from(ercKeysSet).sort();

  const priorityYtdEarn = ["PAY", "DA", "HRA", "CMRE", "Other (T)", "Other(NT)", "Other Pay", "Prev.Yrs.", "Incentive", "Hard Duty", "Erc PRBS", "Erc NPS"];
  const ytdEarnKeys = Array.from(ytdEarnKeysSet).sort((a, b) => {
    const idxA = priorityYtdEarn.indexOf(a);
    const idxB = priorityYtdEarn.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });

  const priorityYtdDed = ["CPF", "CSSS", "WG Rent", "HRR", "Eec PRBS", "Erc PRBS", "I. Tax", "EEC NPS", "Erc NPS", "P. Tax", "HCMRS sch", "ITax-HPadj", "Tot Incm", "Tax Incm"];
  const ytdDedKeys = Array.from(ytdDedKeysSet).sort((a, b) => {
    const idxA = priorityYtdDed.indexOf(a);
    const idxB = priorityYtdDed.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });

  const priorityPerk = ["Housing", "Int Loan", "Asset Tra", "Bachelor"];
  const perkKeys = Array.from(perkKeysSet).sort((a, b) => {
    const idxA = priorityPerk.indexOf(a);
    const idxB = priorityPerk.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });

  const priorityF16 = ["Gross Sal", "Std Dedn", "Income", "Ded us 80", "I.Tax&Sur", "Tax Payab"];
  const f16Keys = Array.from(f16KeysSet).sort((a, b) => {
    const idxA = priorityF16.indexOf(a);
    const idxB = priorityF16.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });

  const loanKeys = Array.from(loanKeysSet);

  // 2. Build HTML Table
  let html = '<thead><tr><th>Salary Components (₹)</th>';
  monthOrder.forEach(m => {
    html += `<th>${m}</th>`;
  });
  html += '</tr></thead><tbody>';

  // --- EARNINGS ---
  html += '<tr class="section-header"><td colspan="13">1. EARNINGS</td></tr>';
  earnKeys.forEach(key => {
    html += `<tr><td>${key}</td>`;
    monthOrder.forEach(m => {
      const slip = yearData[m];
      const val = slip && slip.earnings ? slip.earnings[key] : null;
      if (val !== null && val !== undefined) {
        html += `<td class="numeric ${val < 0 ? 'negative' : ''}">${formatNumber(val)}</td>`;
      } else {
        html += '<td class="numeric" style="color: var(--text-muted);">-</td>';
      }
    });
    html += '</tr>';
  });
  html += '<tr class="total-row" style="color: var(--accent-cyan);"><td>Total Earnings (Gross)</td>';
  monthOrder.forEach(m => {
    const slip = yearData[m];
    const val = slip ? slip.totals.tot_earn : null;
    html += `<td class="numeric">${val ? formatNumber(val) : '-'}</td>`;
  });
  html += '</tr>';

  // --- DEDUCTIONS ---
  html += '<tr class="section-header"><td colspan="13">2. DEDUCTIONS</td></tr>';
  dedKeys.forEach(key => {
    html += `<tr><td>${key}</td>`;
    monthOrder.forEach(m => {
      const slip = yearData[m];
      const val = slip && slip.deductions ? slip.deductions[key] : null;
      if (val !== null && val !== undefined) {
        html += `<td class="numeric ${val < 0 ? 'negative' : ''}">${formatNumber(val)}</td>`;
      } else {
        html += '<td class="numeric" style="color: var(--text-muted);">-</td>';
      }
    });
    html += '</tr>';
  });
  html += '<tr class="total-row" style="color: var(--accent-red);"><td>Total Deductions</td>';
  monthOrder.forEach(m => {
    const slip = yearData[m];
    const val = slip ? slip.totals.tot_dedn : null;
    html += `<td class="numeric">${val ? formatNumber(val) : '-'}</td>`;
  });
  html += '</tr>';

  // --- NET PAY ---
  html += '<tr class="net-pay-row"><td>NET PAY OUTSTANDING</td>';
  monthOrder.forEach(m => {
    const slip = yearData[m];
    const val = slip ? slip.totals.net_pay : null;
    html += `<td class="numeric">${val ? formatNumber(val) : '-'}</td>`;
  });
  html += '</tr>';

  // --- EMPLOYER CONTRIBUTIONS ---
  if (ercKeys.length > 0) {
    html += '<tr class="section-header"><td colspan="13">3. EMPLOYER CONTRIBUTIONS</td></tr>';
    ercKeys.forEach(key => {
      const dispName = ercDisplayNames[key] || key;
      html += `<tr><td>${dispName}</td>`;
      monthOrder.forEach(m => {
        const slip = yearData[m];
        const val = slip && slip.metadata ? slip.metadata[key] : null;
        if (val !== null && val !== undefined) {
          html += `<td class="numeric">${formatNumber(val)}</td>`;
        } else {
          html += '<td class="numeric" style="color: var(--text-muted);">-</td>';
        }
      });
      html += '</tr>';
    });
  }

  // --- YTD EARNINGS ---
  if (ytdEarnKeys.length > 0) {
    html += '<tr class="section-header"><td colspan="13">4. YEAR-TO-DATE (YTD) EARNINGS</td></tr>';
    ytdEarnKeys.forEach(key => {
      html += `<tr><td>YTD ${key}</td>`;
      monthOrder.forEach(m => {
        const slip = yearData[m];
        const val = slip && slip.ytd_earnings ? slip.ytd_earnings[key] : null;
        if (val !== null && val !== undefined) {
          html += `<td class="numeric">${formatNumber(val)}</td>`;
        } else {
          html += '<td class="numeric" style="color: var(--text-muted);">-</td>';
        }
      });
      html += '</tr>';
    });
  }

  // --- YTD DEDUCTIONS ---
  if (ytdDedKeys.length > 0) {
    html += '<tr class="section-header"><td colspan="13">5. YEAR-TO-DATE (YTD) DEDUCTIONS</td></tr>';
    ytdDedKeys.forEach(key => {
      html += `<tr><td>YTD ${key}</td>`;
      monthOrder.forEach(m => {
        const slip = yearData[m];
        const val = slip && slip.ytd_deductions ? slip.ytd_deductions[key] : null;
        if (val !== null && val !== undefined) {
          html += `<td class="numeric">${formatNumber(val)}</td>`;
        } else {
          html += '<td class="numeric" style="color: var(--text-muted);">-</td>';
        }
      });
      html += '</tr>';
    });
  }

  // --- PERKS ---
  if (perkKeys.length > 0) {
    html += '<tr class="section-header"><td colspan="13">6. VALUATION OF PERKS</td></tr>';
    perkKeys.forEach(key => {
      html += `<tr><td>Perk: ${key}</td>`;
      monthOrder.forEach(m => {
        const slip = yearData[m];
        const val = slip && slip.perks ? slip.perks[key] : null;
        if (val !== null && val !== undefined) {
          html += `<td class="numeric">${formatNumber(val)}</td>`;
        } else {
          html += '<td class="numeric" style="color: var(--text-muted);">-</td>';
        }
      });
      html += '</tr>';
    });
  }

  // --- FORM 16 SUMMARY ---
  if (f16Keys.length > 0) {
    html += '<tr class="section-header"><td colspan="13">7. FORM 16 TAX ESTIMATE SUMMARIES</td></tr>';
    f16Keys.forEach(key => {
      html += `<tr style="font-weight: 500;"><td>Form 16: ${key}</td>`;
      monthOrder.forEach(m => {
        const slip = yearData[m];
        const val = slip && slip.form16 ? slip.form16[key] : null;
        if (val !== null && val !== undefined) {
          html += `<td class="numeric">${formatNumber(val)}</td>`;
        } else {
          html += '<td class="numeric" style="color: var(--text-muted);">-</td>';
        }
      });
      html += '</tr>';
    });
  }

  // --- LOANS ---
  if (loanKeys.length > 0) {
    html += '<tr class="section-header"><td colspan="13">8. OUTSTANDING LOAN STATUS</td></tr>';
    loanKeys.forEach(key => {
      html += `<tr><td>${key} (Monthly Instl)</td>`;
      monthOrder.forEach(m => {
        const slip = yearData[m];
        const val = slip && slip.loans && slip.loans[key] ? slip.loans[key].installment : null;
        html += `<td class="numeric">${val ? formatNumber(val) : '-'}</td>`;
      });
      html += '</tr>';

      html += `<tr style="color: var(--text-secondary);"><td>${key} (Outstanding Bal)</td>`;
      monthOrder.forEach(m => {
        const slip = yearData[m];
        const val = slip && slip.loans && slip.loans[key] ? slip.loans[key].balance : null;
        html += `<td class="numeric">${val ? formatNumber(val) : '-'}</td>`;
      });
      html += '</tr>';

      html += `<tr style="color: var(--text-muted);"><td>${key} (Accrued Interest)</td>`;
      monthOrder.forEach(m => {
        const slip = yearData[m];
        const val = slip && slip.loans && slip.loans[key] ? slip.loans[key].accrued_interest : null;
        html += `<td class="numeric">${val ? formatNumber(val) : '-'}</td>`;
      });
      html += '</tr>';
    });
  }

  html += '</tbody>';
  table.innerHTML = html;
}

// Export Ledger to CSV
function exportToCSV() {
  const table = document.getElementById('spreadsheetTable');
  if (!table) return;
  
  let csvContent = "";
  const rows = table.querySelectorAll('tr');
  
  rows.forEach(row => {
    const cols = row.querySelectorAll('th, td');
    const rowData = [];
    cols.forEach(col => {
      // Remove commas from inside numbers to keep CSV format clean
      let text = col.innerText.replace(/,/g, '');
      // Handle empty dashes
      if (text === '-') text = '0.00';
      rowData.push(`"${text}"`);
    });
    csvContent += rowData.join(",") + "\r\n";
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `Salary_Ledger_FY_${selectedYear}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Formula Verification Audit Engine (Part 2)
let auditDiscrepancies = [];

// Helper functions for historical rate maps and rules
function getActiveFY() {
  const verFySelector = document.getElementById('verFySelector');
  const projFySelector = document.getElementById('projFy');
  return (verFySelector ? verFySelector.value : null) || (projFySelector ? projFySelector.value : null) || selectedYear;
}

// Helper functions for historical rate maps and rules
function getDA_RateForMonth(fy, m) {
  const daRates = {
    "2022-23": {
      "April": 30.0, "May": 30.0, "June": 30.0,
      "July": 32.5, "August": 32.5, "September": 32.5,
      "October": 34.8, "November": 34.8, "December": 34.8,
      "January": 37.2, "February": 37.2, "March": 37.2
    },
    "2023-24": {
      "April": 37.7, "May": 37.7, "June": 37.7,
      "July": 39.2, "August": 39.2, "September": 39.2,
      "October": 43.8, "November": 43.8, "December": 43.8,
      "January": 43.7, "February": 43.7, "March": 43.7
    },
    "2024-25": {
      "April": 43.7, "May": 43.7, "June": 44.3,  // June had mid-quarter DA revision
      "July": 44.8, "August": 44.8, "September": 44.8,
      "October": 47.7, "November": 47.7, "December": 47.7,
      "January": 49.6, "February": 49.6, "March": 49.6
    },
    "2025-26": {
      "April": 48.7, "May": 48.7, "June": 48.7,
      "July": 49.0, "August": 49.0, "September": 49.0,
      "October": 49.0, "November": 51.8, "December": 51.8,  // DA hiked from Nov 2025
      "January": 51.8, "February": 51.8, "March": 53.4  // March had further DA hike to 53.4%
    }
  };
  if (daRates[fy] && daRates[fy][m] !== undefined) {
    return daRates[fy][m];
  }
  const vars = getVariablesForFy(fy);
  const daRule = vars.find(v => v.name === "Variable DA");
  if (daRule && daRule.formula && !isNaN(parseFloat(daRule.formula))) {
    return parseFloat(daRule.formula);
  }
  return formulaRules.ruleDA || 53.4; // Default to user-configured rate
}


function getWGValue(fy) {
  const wgValues = {
    "2022-23": 84000.0,
    "2023-24": 84000.0,
    "2024-25": 79868.84,
    "2025-26": 232931.52,
    "2026-27": 260000.0
  };
  return wgValues[fy] || 260000.0;
}

function getUniformValue(fy) {
  const activeFy = getActiveFY();
  if (fy === activeFy) {
    return formulaRules.ruleUniform;
  }
  const uniformValues = {
    "2022-23": 180773.28,
    "2023-24": 198850.68,
    "2024-25": 218735.76,
    "2025-26": 240609.24,
    "2026-27": 264670.20
  };
  return uniformValues[fy] || formulaRules.ruleUniform;
}

function getWGValAdj(fy) {
  const adjs = {
    "2022-23": -1283.33,
    "2023-24": -1283.33,
    "2024-25": -1906.67,
    "2025-26": -1906.67,
    "2026-27": -1906.67
  };
  return adjs[fy] || -1906.67;
}

function getPreviousMonthWithData(fy, monthName) {
  const mIdx = monthOrder.indexOf(monthName);
  for (let i = mIdx - 1; i >= 0; i--) {
    const prevM = monthOrder[i];
    if (salaryDb[fy] && salaryDb[fy][prevM]) {
      return prevM;
    }
  }
  return null;
}

function getChronologicalSlips() {
  const slips = [];
  const years = Object.keys(salaryDb).sort();
  years.forEach(fy => {
    monthOrder.forEach(m => {
      const slip = salaryDb[fy][m];
      if (slip) {
        const fyStartYear = parseInt(fy.split('-')[0]);
        const monthIdx = monthOrder.indexOf(m);
        const calYear = fyStartYear + (monthIdx >= 9 ? 1 : 0);
        const calMonth = (monthIdx + 3) % 12;
        slips.push({
          fy: fy,
          month: m,
          period: calYear * 12 + calMonth,
          slip: slip
        });
      }
    });
  });
  slips.sort((a, b) => a.period - b.period);
  return slips;
}

function getPreviousChronologicalLoanSlip(fy, monthName) {
  const slips = getChronologicalSlips();
  const monthIdx = monthOrder.indexOf(monthName);
  const fyStartYear = parseInt(fy.split('-')[0]);
  const calYear = fyStartYear + (monthIdx >= 9 ? 1 : 0);
  const calMonth = (monthIdx + 3) % 12;
  const currentPeriod = calYear * 12 + calMonth;
  
  for (let i = slips.length - 1; i >= 0; i--) {
    const s = slips[i];
    if (s.period < currentPeriod && s.slip.loans && s.slip.loans["Car/4 Wheeler"]) {
      return s;
    }
  }
  return null;
}

function normalizeComponentName(name) {
  if (!name) return "";
  let s = name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
  s = s.replace(/maintenance/g, 'maint');
  s = s.replace('ongchamembership', 'associationmembership').replace('ongchamem', 'associationmembership').replace('ongcha', 'association');
  s = s.replace('ongcsahyog', 'sahyog').replace('ongc', '');
  s = s.replace('membership', 'mem').replace('membershi', 'mem');
  s = s.replace('society', 'scty');
  s = s.replace('insurance', 'ins');
  s = s.replace('scheme', 'sch').replace('schm', 'sch');
  s = s.replace('employer', 'emplr').replace('emplyr', 'emplr');
  s = s.replace('additional', 'addl').replace('addnl', 'addl').replace('addl', 'addl');
  s = s.replace(/^ytd/, '');
  return s;
}

function getMonthlyActualChangeFromSlip(slip, section, compName, verFy, month) {
  if (!slip) return 0;
  const currentYtd = getComponentValueFromSlip(slip, section, compName);
  const mIdx = monthOrder.indexOf(month);
  if (mIdx === 0) {
    return currentYtd;
  }
  const prevMonth = monthOrder[mIdx - 1];
  const prevSlip = (salaryDb[verFy] && salaryDb[verFy][prevMonth]) ? salaryDb[verFy][prevMonth] : null;
  const prevYtd = prevSlip ? getComponentValueFromSlip(prevSlip, section, compName) : 0;
  return currentYtd - prevYtd;
}

function normalizeFormulaString(formulaStr) {
  if (!formulaStr) return "";
  let s = formulaStr.toString().toLowerCase().replace(/\s+/g, '');
  s = s.replace(/maintenance/g, 'maint');
  s = s.replace(/ongchamembership/g, 'associationmembership')
       .replace(/ongchamem/g, 'associationmembership')
       .replace(/ongcha/g, 'association');
  s = s.replace(/ongcsahyog/g, 'sahyog').replace(/ongc/g, '');
  s = s.replace(/membership/g, 'mem').replace(/membershi/g, 'mem');
  s = s.replace(/society/g, 'scty');
  s = s.replace(/insurance/g, 'ins');
  s = s.replace(/scheme/g, 'sch').replace(/schm/g, 'sch');
  s = s.replace(/employer/g, 'emplr').replace(/emplyr/g, 'emplr');
  s = s.replace(/additional/g, 'addl').replace(/addnl/g, 'addl');
  return s;
}

function getSearchKeysForVariable(variable) {
  const name = variable.name;
  const spaceless = name.toLowerCase().replace(/\s+/g, '');
  const normalized = normalizeComponentName(name);
  
  const keys = new Set();
  keys.add(spaceless);
  keys.add(normalized);
  
  let spacelessReplaced = spaceless;
  spacelessReplaced = spacelessReplaced.replace(/maintenance/g, 'maint')
                                       .replace(/society/g, 'scty')
                                       .replace(/insurance/g, 'ins')
                                       .replace(/scheme/g, 'sch')
                                       .replace(/employer/g, 'emplr')
                                       .replace(/additional/g, 'addl');
  keys.add(spacelessReplaced);
  
  return Array.from(keys).sort((a, b) => b.length - a.length);
}

function isComponentUnexplained(section, name, fy) {
  const activeFy = fy || (document.getElementById('verFySelector') ? document.getElementById('verFySelector').value : null) || getActiveFY();
  const vars = getVariablesForFy(activeFy);
  const normName = normalizeComponentName(name);
  const hasRule = vars.some(v => {
    const rType = (v.type || "").toLowerCase().trim();
    const sType = section.toLowerCase().trim();
    const isLoanMatch = (rType.startsWith("loan") && sType.startsWith("loan"));
    const typeMatches = (rType === sType) || isLoanMatch;
    return typeMatches && normalizeComponentName(v.name) === normName;
  });

  if (section === "Deductions") {
    const standardDeductions = [
      "CPF EEC", "Income Tax", "Prof Tax", "NPS EEC", "CSS Scheme", 
      "Emp PRBS contrib", "PRBS  Addl", "ASTO Rec", "Association Membership", "ONGCHA Membershi", 
      "C&T Scty I", "Officers' Club", "HCMRS Ins Scheme", "Coin Adjus",
      "WG Rent", "White goods Rent", "Emplyr paid ITax", "Bachelor Accom",
      "Sahyog Fund", "ONGC Sahyog Fund", "ONGC Sahyog fund", "HRR incl retro"
    ];
    const normStandard = standardDeductions.map(normalizeComponentName);
    const isStandard = normStandard.includes(normName);
    const isRecovery = name.startsWith("Arr.Rec") || name.includes("Recovery") || name.includes("Rec") || name.includes("Recov");
    
    return !hasRule && (!isStandard || isRecovery);
  } else if (section === "Earnings") {
    const standardEarnings = [
      "Basic Pay", "Other Cafeteria", "LFA Allowance-Ca", "FamilyPlAdjin", 
      "House Rent Allow", "Variable DA", "CMRE", "TPT  Allowance-C", 
      "Maint charge WG", "Uniform Reimb", "Coin Adjus", "WG value adjust-",
      "Cafeteria Adj-HP"
    ];
    const normStandard = standardEarnings.map(normalizeComponentName);
    const isStandard = normStandard.includes(normName);
    const isArrear = name.startsWith("Arr") || name.includes("Retro") || name.includes("Arrear") || name.includes("Arr.");
    
    return !hasRule && (!isStandard || isArrear);
  } else if (section === "Employer Contributions") {
    const standardErc = [
      "erc_cpf", "erc_prbs", "erc_csss", "erc_nps", "erc_eps"
    ];
    const normStandard = standardErc.map(normalizeComponentName);
    const isStandard = normStandard.includes(normName);
    
    return !hasRule && !isStandard;
  } else if (section === "YTD Earnings") {
    const standardYtdEarn = [
      "PAY", "DA", "HRA", "CMRE", "Other (T)", "Other(NT)", 
      "Other Pay", "Prev.Yrs.", "Erc PRBS", "Incentive", "Hard Duty"
    ];
    const normStandard = standardYtdEarn.map(normalizeComponentName);
    return !hasRule && !normStandard.includes(normName);
  } else if (section === "YTD Deductions") {
    const standardYtdDed = [
      "CPF", "CSSS", "WG Rent", "HRR", "Eec PRBS", "Erc PRBS", 
      "I. Tax", "EEC NPS", "Erc NPS", "P. Tax", "HCMRS sch", "ITax-HPadj", "Tot Incm", "Tax Incm"
    ];
    const normStandard = standardYtdDed.map(normalizeComponentName);
    return !hasRule && !normStandard.includes(normName);
  } else if (section === "Perks") {
    const standardPerks = [
      "Housing", "Int Loan", "Asset Tra", "Bachelor"
    ];
    const normStandard = standardPerks.map(normalizeComponentName);
    return !hasRule && !normStandard.includes(normName);
  } else if (section === "Form 16") {
    const standardForm16 = [
      "Gross Sal", "Ded us 80", "Income", "I.Tax&Sur", "Std Dedn", "Tax Payab"
    ];
    const normStandard = standardForm16.map(normalizeComponentName);
    return !hasRule && !normStandard.includes(normName);
  }
  return false;
}

// Helper to determine all unexplained/unrecognized items on a slip
function getUnexplainedItems(verFy, month) {
  const slip = salaryDb[verFy] && salaryDb[verFy][month];
  if (!slip) return [];

  const items = [];

  if (slip.earnings) {
    Object.keys(slip.earnings).forEach(k => {
      const val = parseFloat(slip.earnings[k]) || 0;
      if (val !== 0 && isComponentUnexplained("Earnings", k)) {
        items.push({
          name: k,
          category: "Earnings",
          value: val
        });
      }
    });
  }

  if (slip.deductions) {
    Object.keys(slip.deductions).forEach(k => {
      const val = parseFloat(slip.deductions[k]) || 0;
      if (val !== 0 && isComponentUnexplained("Deductions", k)) {
        items.push({
          name: k,
          category: "Deductions",
          value: val
        });
      }
    });
  }

  if (slip.metadata) {
    Object.keys(slip.metadata).forEach(k => {
      if (k.startsWith("erc_")) {
        const val = parseFloat(slip.metadata[k]) || 0;
        if (val !== 0 && isComponentUnexplained("Employer Contributions", k)) {
          items.push({
            name: k,
            category: "Employer Contributions",
            value: val
          });
        }
      }
    });
  }

  if (slip.ytd_earnings) {
    Object.keys(slip.ytd_earnings).forEach(k => {
      const val = parseFloat(slip.ytd_earnings[k]) || 0;
      if (val !== 0 && isComponentUnexplained("YTD Earnings", k)) {
        items.push({
          name: k,
          category: "YTD Earnings",
          value: val
        });
      }
    });
  }

  if (slip.ytd_deductions) {
    Object.keys(slip.ytd_deductions).forEach(k => {
      const val = parseFloat(slip.ytd_deductions[k]) || 0;
      if (val !== 0 && isComponentUnexplained("YTD Deductions", k)) {
        items.push({
          name: k,
          category: "YTD Deductions",
          value: val
        });
      }
    });
  }

  if (slip.perks) {
    Object.keys(slip.perks).forEach(k => {
      const val = parseFloat(slip.perks[k]) || 0;
      if (val !== 0 && isComponentUnexplained("Perks", k)) {
        items.push({
          name: k,
          category: "Perks",
          value: val
        });
      }
    });
  }

  if (slip.form16) {
    Object.keys(slip.form16).forEach(k => {
      const val = parseFloat(slip.form16[k]) || 0;
      if (val !== 0 && isComponentUnexplained("Form 16", k)) {
        items.push({
          name: k,
          category: "Form 16",
          value: val
        });
      }
    });
  }

  return items;
}

// Audit execution over the selected FY
function runAudit() {
  const verFy = document.getElementById('verFySelector').value;
  syncYearSelectors(verFy);
  const yearData = salaryDb[verFy] || {};
  
  auditDiscrepancies = [];
  let totalRecoveries = 0;

  // Build list of known deduction names based on configured variables
  const knownDeductions = [
    "CPF EEC", "Income Tax", "Prof Tax", "NPS EEC", "CSS Scheme", 
    "Emp PRBS contrib", "PRBS  Addl", "ASTO Rec", "Association Membership", "ONGCHA Membershi", 
    "C&T Scty I", "Officers' Club", "HCMRS Ins Scheme", "Coin Adjus",
    "WG Rent", "White goods Rent", "Emplyr paid ITax", "Bachelor Accom",
    "Sahyog Fund", "ONGC Sahyog Fund", "ONGC Sahyog fund", "Rec Excess call:", "WDV/REC Mobile H",
    "Arr.Bach Acc Rec", "Arr.ASTO Member", "Arr.Penal Int. R", "Arr.Elect Charge", 
    "Arr.Gas charges", "WG GST Recovery", "WDV Laptop Rec A", "Laptop GST recov",
    "ArrRec Excess ca", "TR: Travel Recov", "Arr.CSS Scheme", "Arr.PRBS Addl", 
    "Arr. Association Membership", "Arr.ONGCHA Membe", "Arr.Rec.Car/4 Wh", "PRMB Ann Recov", "HRR incl retro"
  ];
  const allVarsFlat = (formulaRules.variables && formulaRules.variables["default"]) || defaultFormulaVariables;
  allVarsFlat.forEach(v => {
    if (v.type === "Deductions" && !knownDeductions.includes(v.name)) {
      knownDeductions.push(v.name);
    }
  });

  monthOrder.forEach(m => {
    const slip = yearData[m];
    if (!slip) return;
    
    const basic = slip.earnings["Basic Pay"] || 0;
    const da = slip.earnings["Variable DA"] || 0;
    const discrepancies = [];

    // Skip validation if Basic Pay is missing
    if (basic === 0) return;

    // For percentage-based formula calculations, use payrate (full month value) 
    // instead of actual Basic Pay when Basic appears to be prorated (partial month).
    // Allowances like Cafeteria & LFA are typically paid at the full payrate even when
    // Basic Pay is prorated for days worked.
    const payrate = (slip.metadata && slip.metadata.payrate) || basic;
    const isProrated = Math.abs(basic - payrate) > 100; // more than ₹100 difference
    const basicForPct = isProrated ? payrate : basic;
    const prorationFactor = isProrated ? (basic / payrate) : 1.0;

    // Resolve expected basic and expected DA from formula rules
    const expectedBasic = getExpectedComponentValue("Earnings", "Basic Pay", verFy, m, basicForPct, da, slip) || basicForPct;
    const expectedDa = getExpectedComponentValue("Earnings", "Variable DA", verFy, m, expectedBasic, da, slip) || da;

    const expectedBasicProrated = expectedBasic * prorationFactor;
    const expectedDaProrated = expectedDa * prorationFactor;

    // Get rule components for this FY
    const ruleVars = getVariablesForFy(verFy);
    const ruleEarnNames = ruleVars.filter(v => v.type === "Earnings").map(v => v.name);
    const ruleDedNames = ruleVars.filter(v => v.type === "Deductions").map(v => v.name);

    // Check all parsed earnings against rules
    const allEarnKeys = new Set([...Object.keys(slip.earnings), ...ruleEarnNames]);
    const seenNormEarn = new Set();
    allEarnKeys.forEach(k => {
      const norm = normalizeComponentName(k);
      if (seenNormEarn.has(norm)) return;
      seenNormEarn.add(norm);
      
      // For prorated months, skip Basic Pay and Variable DA checks since they are
      // intentionally prorated (proportionally adjusted) and will always show a "discrepancy"
      // when compared against the full-rate formula.
      if (isProrated && (k === "Basic Pay" || k === "Variable DA" || k === "WG value adjust-")) return;
      
      const act = slip.earnings[k] || 0;
      const isUnexplained = isComponentUnexplained("Earnings", k, verFy);
      if (isUnexplained) return;

      const exp = getExpectedComponentValue("Earnings", k, verFy, m, expectedBasic, expectedDa, slip);
      if (exp !== null) {
        const diff = act - exp;
        const threshold = (k === "Variable DA" || k === "Maint charge WG" || k === "Uniform Reimb") ? 10 : 2;
        if (Math.abs(diff) > threshold) {
          discrepancies.push({
            item: k,
            type: "Earnings",
            actual: act,
            expected: exp,
            variance: diff,
            desc: `Expected ${formatNumber(exp)}, got ${formatNumber(act)}`
          });
        }
      }
    });

    // Check all parsed deductions against rules
    const allDedKeys = new Set([...Object.keys(slip.deductions), ...ruleDedNames]);
    const seenNormDed = new Set();
    allDedKeys.forEach(k => {
      const norm = normalizeComponentName(k);
      if (seenNormDed.has(norm)) return;
      seenNormDed.add(norm);

      const act = slip.deductions[k] || 0;
      const isUnexplained = isComponentUnexplained("Deductions", k, verFy);
      if (isUnexplained) return;

      const exp = getExpectedComponentValue("Deductions", k, verFy, m, expectedBasicProrated, expectedDaProrated, slip);
      if (exp !== null) {
        const diff = act - exp;
        if (Math.abs(diff) > 2) {
          discrepancies.push({
            item: k,
            type: "Deductions",
            actual: act,
            expected: exp,
            variance: diff,
            desc: `Expected ${formatNumber(exp)}, got ${formatNumber(act)}`
          });
        }
      }
    });

    // Check employer contributions against rules
    const ercDisplayNames = {
      "erc_cpf": "Employer CPF (ERC CPF)",
      "erc_prbs": "Employer PRBS (ERC PRBS)",
      "erc_csss": "Employer CSSS (ERC CSSS)",
      "erc_nps": "Employer NPS (ERC NPS)",
      "erc_eps": "Employer EPS (ERC EPS)"
    };
    ["erc_cpf", "erc_prbs", "erc_csss", "erc_nps", "erc_eps"].forEach(k => {
      const act = slip.metadata[k] || 0;
      const isUnexplained = isComponentUnexplained("Employer Contributions", k, verFy);
      if (isUnexplained) return;

      const exp = getExpectedComponentValue("Employer Contributions", k, verFy, m, expectedBasicProrated, expectedDaProrated, slip);
      if (exp !== null) {
        const diff = act - exp;
        const threshold = 10;
        if (Math.abs(diff) > threshold && act > 0) {
          discrepancies.push({
            item: ercDisplayNames[k] || k,
            type: "Employer Contribution",
            actual: act,
            expected: exp,
            variance: diff,
            desc: `Expected ${formatNumber(exp)}, got ${formatNumber(act)}`
          });
        }
      }
    });

    // Check YTD Total Income (Tot Incm)
    const actualTotIncm = slip.ytd_deductions["Tot Incm"] || 0;
    if (actualTotIncm > 0) {
      const pay = slip.ytd_earnings["PAY"] || 0;
      const ytd_da = slip.ytd_earnings["DA"] || 0;
      const hra = slip.ytd_earnings["HRA"] || 0;
      const cmre = slip.ytd_earnings["CMRE"] || 0;
      const otherT = slip.ytd_earnings["Other (T)"] || 0;
      const otherNT = slip.ytd_earnings["Other(NT)"] || 0;
      const otherPay = slip.ytd_earnings["Other Pay"] || 0;
      const prevYrs = slip.ytd_earnings["Prev.Yrs."] || 0;
      const incentive = slip.ytd_earnings["Incentive"] || 0;
      const hardDuty = slip.ytd_earnings["Hard Duty"] || 0;

      const expectedTotIncm = pay + ytd_da + hra + cmre + otherT + otherNT + otherPay + prevYrs + incentive + hardDuty;
      const varTotIncm = actualTotIncm - expectedTotIncm;
      if (Math.abs(varTotIncm) > 15) {
        discrepancies.push({
          item: "YTD Tot Incm",
          type: "YTD Summary",
          actual: actualTotIncm,
          expected: expectedTotIncm,
          variance: varTotIncm,
          desc: `Expected YTD Tot Incm (${expectedTotIncm}), got ${actualTotIncm}`
        });
      }
    }

    // Check Form 16 Std Deduction
    const actualStdDed = slip.form16["Std Dedn"] || 0;
    if (actualStdDed > 0) {
      const expectedStdDed = parseInt(slip.metadata.year) >= 2025 ? 75000 : 50000;
      const varStdDed = actualStdDed - expectedStdDed;
      if (Math.abs(varStdDed) > 2) {
        discrepancies.push({
          item: "Form 16 Std Deduction",
          type: "Form 16 Summary",
          actual: actualStdDed,
          expected: expectedStdDed,
          variance: varStdDed,
          desc: `Expected Standard Deduction of ${expectedStdDed}, got ${actualStdDed}`
        });
      }
    }

    // Check Form 16 Ded us 80 (NPS Projection Rule)
    const actualDed80 = slip.form16["Ded us 80"] || 0;
    const actualErcNPS = slip.metadata.erc_nps || 0;
    if (actualDed80 > 0 && actualErcNPS > 0) {
      const mIdx = monthOrder.indexOf(m);
      const remainingMonths = 11 - mIdx;
      const baseNps = actualErcNPS - (slip.earnings["Arr.Variable DA"] || 0) * 0.14;
      const prevMonth = getPreviousMonthWithData(verFy, m);
      const prevSlip = prevMonth ? salaryDb[verFy][prevMonth] : null;
      const prevYtdErcNps = prevSlip && prevSlip.ytd_deductions ? (prevSlip.ytd_deductions["Erc NPS"] || 0) : 0;
      const expectedDed80 = prevYtdErcNps + actualErcNPS + Math.round(baseNps) * remainingMonths;
      const varDed80 = actualDed80 - expectedDed80;
      if (Math.abs(varDed80) > 100) {
        discrepancies.push({
          item: "Form 16 Ded us 80",
          type: "Form 16 Summary",
          actual: actualDed80,
          expected: expectedDed80,
          variance: varDed80,
          desc: `Expected Ded us 80 projection of ${expectedDed80}, got ${actualDed80}`
        });
      }
    }

    // Check unexplained items (Earnings, Deductions, and Employer Contributions)
    const unexplainedItems = getUnexplainedItems(verFy, m);
    unexplainedItems.forEach(item => {
      const val = item.value;
      if (item.category === "Deductions") {
        totalRecoveries += val;
        discrepancies.push({
          item: item.name,
          type: "Recovery",
          actual: val,
          expected: 0,
          variance: val,
          desc: `Unexplained Employer Recovery: ${item.name} of ${val}`
        });
      } else if (item.category === "Earnings") {
        totalRecoveries += val;
        discrepancies.push({
          item: item.name,
          type: "Arrear / Extra",
          actual: val,
          expected: 0,
          variance: val,
          desc: `Special Arrear or Benefit Payment: ${item.name} of ${val}`
        });
      } else if (item.category === "Employer Contributions") {
        totalRecoveries += val;
        discrepancies.push({
          item: ercDisplayNames[item.name] || item.name,
          type: "Employer Contribution",
          actual: val,
          expected: 0,
          variance: val,
          desc: `Unexplained Employer Contribution: ${item.name} of ${val}`
        });
      }
    });

    if (discrepancies.length > 0) {
      auditDiscrepancies.push({
        month: m,
        discrepancies: discrepancies
      });
    }
  });

  // Render left list of months
  const listEl = document.getElementById('auditMonthsList');
  listEl.innerHTML = '';
  
  auditDiscrepancies.forEach((audit, index) => {
    const div = document.createElement('div');
    div.className = `discrepancy-item ${activeMonthAudit === audit.month ? 'active' : ''}`;
    div.onclick = () => selectAuditMonth(audit.month);
    
    div.innerHTML = `
      <div class="discrepancy-meta">
        <span class="discrepancy-month">${audit.month}</span>
        <span class="discrepancy-count">${audit.discrepancies.length} Alerts</span>
      </div>
      <div class="discrepancy-brief">
        ${audit.discrepancies[0].item}: ${audit.discrepancies[0].type} variance
      </div>
    `;
    listEl.appendChild(div);
  });

  if (auditDiscrepancies.length === 0) {
    document.getElementById('verDiscrepanciesCount').innerText = '0';
    document.getElementById('verRecoveriesTotal').innerText = formatINR(0);
    document.querySelector('.discrepancy-card .kpi-subtitle').innerText = 'Differences from formula';
    document.querySelector('.recovery-card .kpi-subtitle').innerText = 'Unexplained items not in formula';

    listEl.innerHTML = '<div style="text-align: center; color: var(--text-muted); margin-top: 5rem;">No variances detected. The payroll matches rules perfectly!</div>';
    document.getElementById('auditDetailTitle').innerText = "Variance Analysis";
    const summaryCardsEl = document.getElementById('auditSummaryCards');
    if (summaryCardsEl) summaryCardsEl.innerHTML = '';
    document.getElementById('earnCompareTable').querySelector('tbody').innerHTML = '<tr><td colspan="4" style="text-align:center;">No data select a month</td></tr>';
    document.getElementById('dedCompareTable').querySelector('tbody').innerHTML = '<tr><td colspan="4" style="text-align:center;">No data select a month</td></tr>';
    document.getElementById('ercCompareTable').querySelector('tbody').innerHTML = '<tr><td colspan="4" style="text-align:center;">No data select a month</td></tr>';
    document.getElementById('ytdCompareTable').querySelector('tbody').innerHTML = '<tr><td colspan="4" style="text-align:center;">No data select a month</td></tr>';
  } else {
    // Select the first month with errors by default if none selected or if the selected month has no errors in the new year
    const hasDiscrepancy = auditDiscrepancies.some(a => a.month === activeMonthAudit);
    if (!activeMonthAudit || !hasDiscrepancy) {
      selectAuditMonth(auditDiscrepancies[0].month);
    } else {
      selectAuditMonth(activeMonthAudit);
    }
  }

}

function changeAuditMode(mode) {
  auditMode = mode;
  // Update UI active buttons
  const monthlyBtn = document.getElementById('modeBtnMonthly');
  const ytdBtn = document.getElementById('modeBtnYtd');
  if (monthlyBtn && ytdBtn) {
    if (mode === 'monthly') {
      monthlyBtn.classList.add('active');
      monthlyBtn.style.color = 'var(--text-primary)';
      monthlyBtn.style.background = 'rgba(255,255,255,0.08)';
      
      ytdBtn.classList.remove('active');
      ytdBtn.style.color = 'var(--text-secondary)';
      ytdBtn.style.background = 'none';
    } else {
      ytdBtn.classList.add('active');
      ytdBtn.style.color = 'var(--text-primary)';
      ytdBtn.style.background = 'rgba(255,255,255,0.08)';
      
      monthlyBtn.classList.remove('active');
      monthlyBtn.style.color = 'var(--text-secondary)';
      monthlyBtn.style.background = 'none';
    }
  }
  // Re-run rendering of selected audit details
  if (activeMonthAudit) {
    selectAuditMonth(activeMonthAudit);
  }
}

// Select Month to Audit in detail panel
function selectAuditMonth(month) {
  activeMonthAudit = month;
  
  // Highlight in list
  const items = document.querySelectorAll('.discrepancy-item');
  items.forEach(el => {
    el.classList.remove('active');
    if (el.querySelector('.discrepancy-month').innerText === month) {
      el.classList.add('active');
    }
  });

  document.getElementById('auditDetailTitle').innerText = `${auditMode === 'ytd' ? 'YTD Cumulative' : 'Monthly'} Audit Comparison Detail for ${month} (FY ${document.getElementById('verFySelector').value})`;
  
  const verFy = document.getElementById('verFySelector').value;
  const slip = salaryDb[verFy][month];
  if (!slip) return;
  
  const basic = slip.earnings["Basic Pay"] || 0;
  const da = slip.earnings["Variable DA"] || 0;
  
  // Use payrate for percentage-based calculations when Basic is prorated (partial month)
  const payrate = (slip.metadata && slip.metadata.payrate) || basic;
  const basicForPct = Math.abs(basic - payrate) > 100 ? payrate : basic;
  const prorationFactor = Math.abs(basic - payrate) > 100 ? (basic / payrate) : 1.0;

  // Resolve expected basic and expected DA from formula rules
  const expectedBasic = getExpectedComponentValue("Earnings", "Basic Pay", verFy, month, basicForPct, da, slip) || basicForPct;
  const expectedDa = getExpectedComponentValue("Earnings", "Variable DA", verFy, month, expectedBasic, da, slip) || da;

  const expectedBasicProrated = expectedBasic * prorationFactor;
  const expectedDaProrated = expectedDa * prorationFactor;
  
  // Gather YTD chronological months list up to selected month
  const selectedMonthIdx = monthOrder.indexOf(month);
  const ytdMonthsList = monthOrder.slice(0, selectedMonthIdx + 1);
  const activeSlips = [];
  ytdMonthsList.forEach(m => {
    if (salaryDb[verFy] && salaryDb[verFy][m]) {
      activeSlips.push({ monthName: m, slip: salaryDb[verFy][m] });
    }
  });

  // Get formula variables lists (use the verFy-specific list for completeness)
  const ruleVars = getVariablesForFy(verFy);
  const ruleEarnNames = ruleVars.filter(v => v.type === "Earnings").map(v => v.name);
  const ruleDedNames = ruleVars.filter(v => v.type === "Deductions").map(v => v.name);

  // 1. Calculate Selected Month Gross & Net (Actual vs Expected)
  let monthlyActualGross = 0;
  let monthlyExpectedGross = 0;
  const monthEarnNames = new Set([...Object.keys(slip.earnings), ...ruleEarnNames]);
  const seenNormEarn1 = new Set();
  monthEarnNames.forEach(name => {
    const norm = normalizeComponentName(name);
    if (seenNormEarn1.has(norm)) return;
    seenNormEarn1.add(norm);

    const act = slip.earnings[name] || 0;
    const isUnexplained = isComponentUnexplained("Earnings", name);
    let exp = isUnexplained ? 0 : act;
    if (!isUnexplained) {
      const tempExp = getExpectedComponentValue("Earnings", name, verFy, month, expectedBasic, expectedDa, slip);
      if (tempExp !== null) exp = tempExp;
    }
    monthlyActualGross += act;
    monthlyExpectedGross += exp;
  });

  let monthlyActualDeductions = 0;
  let monthlyExpectedDeductions = 0;
  const monthDedNames = new Set([...Object.keys(slip.deductions), ...ruleDedNames]);
  const seenNormDed1 = new Set();
  monthDedNames.forEach(name => {
    const norm = normalizeComponentName(name);
    if (seenNormDed1.has(norm)) return;
    seenNormDed1.add(norm);

    const act = slip.deductions[name] || 0;
    const isUnexplained = isComponentUnexplained("Deductions", name);
    let exp = isUnexplained ? 0 : act;
    if (!isUnexplained) {
      const tempExp = getExpectedComponentValue("Deductions", name, verFy, month, expectedBasicProrated, expectedDaProrated, slip);
      if (tempExp !== null) exp = tempExp;
    }
    monthlyActualDeductions += act;
    monthlyExpectedDeductions += exp;
  });

  let monthlyActualLoans = 0;
  if (slip.loans) {
    Object.keys(slip.loans).forEach(k => {
      const loan = slip.loans[k];
      if (loan && typeof loan === "object") {
        monthlyActualLoans += (loan.installment || 0);
      } else {
        monthlyActualLoans += (parseFloat(loan) || 0);
      }
    });
  }

  let monthlyExpectedLoans = 0;
  const loanRules = ruleVars.filter(v => v.type === "Loans" || v.type === "Loan");
  loanRules.forEach(v => {
    const exp = getExpectedComponentValue("Loans", v.name, verFy, month, basicForPct, da, slip);
    if (exp !== null) {
      monthlyExpectedLoans += exp;
    }
  });

  const monthlyActualNet = monthlyActualGross - monthlyActualDeductions - monthlyActualLoans;
  const monthlyExpectedNet = monthlyExpectedGross - monthlyExpectedDeductions - monthlyExpectedLoans;
  const monthlyGrossVariance = monthlyActualGross - monthlyExpectedGross;
  const monthlyNetVariance = monthlyActualNet - monthlyExpectedNet;

  // 2. Calculate YTD Cumulative Gross & Net (Actual vs Expected)
  let ytdActualGross = 0;
  let ytdExpectedGross = 0;
  let ytdActualDeductions = 0;
  let ytdExpectedDeductions = 0;
  let ytdActualLoans = 0;
  let ytdExpectedLoans = 0;

  activeSlips.forEach(sObj => {
    const s = sObj.slip;
    const b = s.earnings["Basic Pay"] || 0;
    const d = s.earnings["Variable DA"] || 0;
    const mName = sObj.monthName;
    // Use payrate for percentage-based calculations in prorated months
    const sPayrate = (s.metadata && s.metadata.payrate) || b;
    const bForPct = Math.abs(b - sPayrate) > 100 ? sPayrate : b;
    const sProrationFactor = Math.abs(b - sPayrate) > 100 ? (b / sPayrate) : 1.0;

    const expBasic = getExpectedComponentValue("Earnings", "Basic Pay", verFy, mName, bForPct, d, s) || bForPct;
    const expDa = getExpectedComponentValue("Earnings", "Variable DA", verFy, mName, expBasic, d, s) || d;

    const expBasicProrated = expBasic * sProrationFactor;
    const expDaProrated = expDa * sProrationFactor;

    const sEarnNames = new Set([...Object.keys(s.earnings), ...ruleEarnNames]);
    const seenNormEarn2 = new Set();
    sEarnNames.forEach(name => {
      const norm = normalizeComponentName(name);
      if (seenNormEarn2.has(norm)) return;
      seenNormEarn2.add(norm);

      const act = s.earnings[name] || 0;
      const isUnexplained = isComponentUnexplained("Earnings", name);
      let exp = isUnexplained ? 0 : act;
      if (!isUnexplained) {
        const tempExp = getExpectedComponentValue("Earnings", name, verFy, mName, expBasic, expDa, s);
        if (tempExp !== null) exp = tempExp;
      }
      ytdActualGross += act;
      ytdExpectedGross += exp;
    });

    const sDedNames = new Set([...Object.keys(s.deductions), ...ruleDedNames]);
    const seenNormDed2 = new Set();
    sDedNames.forEach(name => {
      const norm = normalizeComponentName(name);
      if (seenNormDed2.has(norm)) return;
      seenNormDed2.add(norm);

      const act = s.deductions[name] || 0;
      const isUnexplained = isComponentUnexplained("Deductions", name);
      let exp = isUnexplained ? 0 : act;
      if (!isUnexplained) {
        const tempExp = getExpectedComponentValue("Deductions", name, verFy, mName, expBasicProrated, expDaProrated, s);
        if (tempExp !== null) exp = tempExp;
      }
      ytdActualDeductions += act;
      ytdExpectedDeductions += exp;
    });

    if (s.loans) {
      Object.keys(s.loans).forEach(k => {
        const loan = s.loans[k];
        if (loan && typeof loan === "object") {
          ytdActualLoans += (loan.installment || 0);
        } else {
          ytdActualLoans += (parseFloat(loan) || 0);
        }
      });
    }

    const sLoanRules = ruleVars.filter(v => v.type === "Loans" || v.type === "Loan");
    sLoanRules.forEach(v => {
      const exp = getExpectedComponentValue("Loans", v.name, verFy, mName, bForPct, d, s);
      if (exp !== null) {
        ytdExpectedLoans += exp;
      }
    });
  });

  const ytdActualNet = ytdActualGross - ytdActualDeductions - ytdActualLoans;
  const ytdExpectedNet = ytdExpectedGross - ytdExpectedDeductions - ytdExpectedLoans;
  const ytdGrossVariance = ytdActualGross - ytdExpectedGross;
  const ytdNetVariance = ytdActualNet - ytdExpectedNet;

  // Render the Variance Audit Summary Cards
  const summaryCardsEl = document.getElementById('auditSummaryCards');
  if (summaryCardsEl) {
    const renderVar = (val) => {
      const isDiff = Math.abs(val) > 2;
      if (!isDiff) return `<span class="audit-summary-var neutral">₹0.00</span>`;
      const sign = val > 0 ? '+' : '';
      const className = val > 0 ? 'positive' : 'negative';
      return `<span class="audit-summary-var ${className}">${sign}${formatNumber(val)}</span>`;
    };

    summaryCardsEl.innerHTML = `
      <div class="audit-summary-card month-card">
        <div class="audit-summary-title">
          <span>Monthly Summary: ${month}</span>
        </div>
        <div class="audit-summary-row">
          <span>Actual Gross Salary</span>
          <span class="audit-summary-val">${formatINR(monthlyActualGross)}</span>
        </div>
        <div class="audit-summary-row">
          <span>Expected Gross Salary</span>
          <span class="audit-summary-val">${formatINR(monthlyExpectedGross)}</span>
        </div>
        <div class="audit-summary-row">
          <span>Gross Pay Variation</span>
          <span>${renderVar(monthlyGrossVariance)}</span>
        </div>
        <div class="audit-summary-row total-row">
          <span>Actual Net Pay Out</span>
          <span class="audit-summary-val" style="color: var(--accent-green); font-weight: 700;">${formatINR(monthlyActualNet)}</span>
        </div>
        <div class="audit-summary-row">
          <span>Expected Net Pay Out</span>
          <span class="audit-summary-val">${formatINR(monthlyExpectedNet)}</span>
        </div>
        <div class="audit-summary-row">
          <span>Net Pay Variation</span>
          <span>${renderVar(monthlyNetVariance)}</span>
        </div>
      </div>

      <div class="audit-summary-card ytd-card">
        <div class="audit-summary-title">
          <span>Cumulative YTD Summary (April - ${month})</span>
        </div>
        <div class="audit-summary-row">
          <span>Actual YTD Gross Salary</span>
          <span class="audit-summary-val">${formatINR(ytdActualGross)}</span>
        </div>
        <div class="audit-summary-row">
          <span>Expected YTD Gross Salary</span>
          <span class="audit-summary-val">${formatINR(ytdExpectedGross)}</span>
        </div>
        <div class="audit-summary-row">
          <span>YTD Gross Variation</span>
          <span>${renderVar(ytdGrossVariance)}</span>
        </div>
        <div class="audit-summary-row total-row">
          <span>Actual YTD Net Pay Out</span>
          <span class="audit-summary-val" style="color: var(--accent-green); font-weight: 700;">${formatINR(ytdActualNet)}</span>
        </div>
        <div class="audit-summary-row">
          <span>Expected YTD Net Pay Out</span>
          <span class="audit-summary-val">${formatINR(ytdExpectedNet)}</span>
        </div>
        <div class="audit-summary-row">
          <span>YTD Net Pay Variation</span>
          <span>${renderVar(ytdNetVariance)}</span>
        </div>
      </div>
    `;
  }

  // Render Earnings Comparison Table
  const earnTable = document.getElementById('earnCompareTable');
  earnTable.querySelector('thead tr').innerHTML = `
    <th>Earnings Item</th>
    <th style="text-align: right;">${auditMode === 'ytd' ? 'Actual (YTD)' : 'Actual'}</th>
    <th style="text-align: right;">${auditMode === 'ytd' ? 'Expected (YTD)' : 'Expected'}</th>
    <th style="text-align: right;">Var</th>
  `;
  const earnTbody = earnTable.querySelector('tbody');
  earnTbody.innerHTML = '';
  
  if (auditMode === 'ytd') {
    // Cumulative YTD Earnings Sum
    const earnKeysSet = new Set();
    activeSlips.forEach(sObj => {
      Object.keys(sObj.slip.earnings).forEach(k => earnKeysSet.add(k));
    });
    ruleEarnNames.forEach(k => earnKeysSet.add(k));
    
    const seenNormEarn3 = new Set();
    earnKeysSet.forEach(k => {
      const norm = normalizeComponentName(k);
      if (seenNormEarn3.has(norm)) return;
      seenNormEarn3.add(norm);

      let actualSum = 0;
      let expectedSum = 0;
      
      activeSlips.forEach(sObj => {
        const act = sObj.slip.earnings[k] || 0;
        actualSum += act;
        
        const b = sObj.slip.earnings["Basic Pay"] || 0;
        const d = sObj.slip.earnings["Variable DA"] || 0;
        const sPayrate2 = (sObj.slip.metadata && sObj.slip.metadata.payrate) || b;
        const bFP = Math.abs(b - sPayrate2) > 100 ? sPayrate2 : b;

        const expBasic = getExpectedComponentValue("Earnings", "Basic Pay", verFy, sObj.monthName, bFP, d, sObj.slip) || bFP;
        const expDa = getExpectedComponentValue("Earnings", "Variable DA", verFy, sObj.monthName, expBasic, d, sObj.slip) || d;

        const isUnexplained = isComponentUnexplained("Earnings", k);
        let expVal = isUnexplained ? 0 : act;
        
        if (!isUnexplained) {
          const tempExp = getExpectedComponentValue("Earnings", k, verFy, sObj.monthName, expBasic, expDa, sObj.slip);
          if (tempExp !== null) expVal = tempExp;
        }
        
        expectedSum += expVal;
      });
      
      const diff = actualSum - expectedSum;
      const isDiff = Math.abs(diff) > 5;
      const row = document.createElement('tr');
      if (isDiff) {
        row.className = diff > 0 ? 'diff-highlight-green' : 'diff-highlight';
      }
      row.innerHTML = `
        <td>${k}</td>
        <td class="numeric">${formatNumber(actualSum)}</td>
        <td class="numeric">${formatNumber(expectedSum)}</td>
        <td class="numeric">${isDiff ? formatNumber(diff) : '0.00'}</td>
      `;
      earnTbody.appendChild(row);
    });
  } else {
    // Monthly Earnings comparison (using combined key set of slip + rules)
    const allEarnKeys = new Set([...Object.keys(slip.earnings), ...ruleEarnNames]);
    const seenNormEarn4 = new Set();
    allEarnKeys.forEach(k => {
      const norm = normalizeComponentName(k);
      if (seenNormEarn4.has(norm)) return;
      seenNormEarn4.add(norm);

      const act = slip.earnings[k] || 0;
      const isUnexplained = isComponentUnexplained("Earnings", k);
      let exp = isUnexplained ? 0 : act;
      
      if (!isUnexplained) {
        const tempExp = getExpectedComponentValue("Earnings", k, verFy, month, expectedBasic, expectedDa, slip);
        if (tempExp !== null) exp = tempExp;
      }
      
      const diff = act - exp;
      const isDiff = Math.abs(diff) > 2;

      const row = document.createElement('tr');
      if (isDiff) {
        row.className = diff > 0 ? 'diff-highlight-green' : 'diff-highlight';
      }
      
      row.innerHTML = `
        <td>${k}</td>
        <td class="numeric">${formatNumber(act)}</td>
        <td class="numeric">${formatNumber(exp)}</td>
        <td class="numeric">${isDiff ? formatNumber(diff) : '0.00'}</td>
      `;
      earnTbody.appendChild(row);
    });
  }

  // Render Deductions Comparison Table
  const dedTable = document.getElementById('dedCompareTable');
  dedTable.querySelector('thead tr').innerHTML = `
    <th>Deduction Item</th>
    <th style="text-align: right;">${auditMode === 'ytd' ? 'Actual (YTD)' : 'Actual'}</th>
    <th style="text-align: right;">${auditMode === 'ytd' ? 'Expected (YTD)' : 'Expected'}</th>
    <th style="text-align: right;">Var</th>
  `;
  const dedTbody = dedTable.querySelector('tbody');
  dedTbody.innerHTML = '';
  
  if (auditMode === 'ytd') {
    // Cumulative YTD Deductions Sum
    const dedKeysSet = new Set();
    activeSlips.forEach(sObj => {
      Object.keys(sObj.slip.deductions).forEach(k => dedKeysSet.add(k));
    });
    ruleDedNames.forEach(k => dedKeysSet.add(k));
    
    const seenNormDed3 = new Set();
    dedKeysSet.forEach(k => {
      const norm = normalizeComponentName(k);
      if (seenNormDed3.has(norm)) return;
      seenNormDed3.add(norm);

      let actualSum = 0;
      let expectedSum = 0;
      
      activeSlips.forEach(sObj => {
        const act = sObj.slip.deductions[k] || 0;
        actualSum += act;
        
        const b = sObj.slip.earnings["Basic Pay"] || 0;
        const d = sObj.slip.earnings["Variable DA"] || 0;
        const sPayrate3 = (sObj.slip.metadata && sObj.slip.metadata.payrate) || b;
        const bFPD = Math.abs(b - sPayrate3) > 100 ? sPayrate3 : b;
        const sProrationFactor = Math.abs(b - sPayrate3) > 100 ? (b / sPayrate3) : 1.0;

        const expBasic = getExpectedComponentValue("Earnings", "Basic Pay", verFy, sObj.monthName, bFPD, d, sObj.slip) || bFPD;
        const expDa = getExpectedComponentValue("Earnings", "Variable DA", verFy, sObj.monthName, expBasic, d, sObj.slip) || d;

        const expBasicProrated = expBasic * sProrationFactor;
        const expDaProrated = expDa * sProrationFactor;

        const isUnexplained = isComponentUnexplained("Deductions", k);
        let expVal = isUnexplained ? 0 : act;
        
        if (!isUnexplained) {
          const tempExp = getExpectedComponentValue("Deductions", k, verFy, sObj.monthName, expBasicProrated, expDaProrated, sObj.slip);
          if (tempExp !== null) expVal = tempExp;
        }
        
        expectedSum += expVal;
      });
      
      const diff = actualSum - expectedSum;
      const isDiff = Math.abs(diff) > 5;
      const row = document.createElement('tr');
      if (isDiff) {
        row.className = 'diff-highlight';
      }
      row.innerHTML = `
        <td>${k}</td>
        <td class="numeric">${formatNumber(actualSum)}</td>
        <td class="numeric">${formatNumber(expectedSum)}</td>
        <td class="numeric">${isDiff ? formatNumber(diff) : '0.00'}</td>
      `;
      dedTbody.appendChild(row);
    });
  } else {
    // Monthly Deductions comparison (using combined key set of slip + rules)
    const allDedKeys = new Set([...Object.keys(slip.deductions), ...ruleDedNames]);
    const seenNormDed4 = new Set();
    allDedKeys.forEach(k => {
      const norm = normalizeComponentName(k);
      if (seenNormDed4.has(norm)) return;
      seenNormDed4.add(norm);

      const act = slip.deductions[k] || 0;
      const isUnexplained = isComponentUnexplained("Deductions", k);
      let exp = isUnexplained ? 0 : act;
      
      if (!isUnexplained) {
        const tempExp = getExpectedComponentValue("Deductions", k, verFy, month, expectedBasicProrated, expectedDaProrated, slip);
        if (tempExp !== null) exp = tempExp;
      }
      
      const diff = act - exp;
      const isDiff = Math.abs(diff) > 2;

      const row = document.createElement('tr');
      if (isDiff) {
        row.className = 'diff-highlight';
      }
      
      row.innerHTML = `
        <td>${k}</td>
        <td class="numeric">${formatNumber(act)}</td>
        <td class="numeric">${formatNumber(exp)}</td>
        <td class="numeric">${isDiff ? formatNumber(diff) : '0.00'}</td>
      `;
      dedTbody.appendChild(row);
    });
  }

  // Render Employer Contributions (ERC) Comparison Table
  const ercTable = document.getElementById('ercCompareTable');
  ercTable.querySelector('thead tr').innerHTML = `
    <th>Employer Contribution</th>
    <th style="text-align: right;">${auditMode === 'ytd' ? 'Actual (YTD)' : 'Actual'}</th>
    <th style="text-align: right;">${auditMode === 'ytd' ? 'Expected (YTD)' : 'Expected'}</th>
    <th style="text-align: right;">Var</th>
  `;
  const ercTbody = ercTable.querySelector('tbody');
  ercTbody.innerHTML = '';
  
  const ercDisplayNames = {
    "erc_cpf": "ERC CPF Contribution",
    "erc_prbs": "ERC PRBS Contribution",
    "erc_csss": "ERC CSSS Contribution",
    "erc_nps": "ERC NPS Contribution",
    "erc_eps": "ERC EPS Contribution"
  };
  
  if (auditMode === 'ytd') {
    // Cumulative YTD ERC Sum
    const ercKeysSet = new Set();
    activeSlips.forEach(sObj => {
      Object.keys(sObj.slip.metadata).forEach(k => {
        if (k.startsWith("erc_")) ercKeysSet.add(k);
      });
    });
    ruleVars.filter(v => v.type === "Employer Contributions").forEach(v => ercKeysSet.add(v.name));

    const seenNormErc1 = new Set();
    ercKeysSet.forEach(k => {
      const norm = normalizeComponentName(k);
      if (seenNormErc1.has(norm)) return;
      seenNormErc1.add(norm);

      let actualSum = 0;
      let expectedSum = 0;
      
      activeSlips.forEach(sObj => {
        const act = sObj.slip.metadata[k] || 0;
        actualSum += act;
        
        const b = sObj.slip.earnings["Basic Pay"] || 0;
        const d = sObj.slip.earnings["Variable DA"] || 0;
        const sPayrate = (sObj.slip.metadata && sObj.slip.metadata.payrate) || b;
        const bFP = Math.abs(b - sPayrate) > 100 ? sPayrate : b;
        const sProrationFactor = Math.abs(b - sPayrate) > 100 ? (b / sPayrate) : 1.0;

        const expBasic = getExpectedComponentValue("Earnings", "Basic Pay", verFy, sObj.monthName, bFP, d, sObj.slip) || bFP;
        const expDa = getExpectedComponentValue("Earnings", "Variable DA", verFy, sObj.monthName, expBasic, d, sObj.slip) || d;

        const expBasicProrated = expBasic * sProrationFactor;
        const expDaProrated = expDa * sProrationFactor;

        const isUnexplained = isComponentUnexplained("Employer Contributions", k);
        let expVal = isUnexplained ? 0 : act;
        
        if (!isUnexplained) {
          const tempExp = getExpectedComponentValue("Employer Contributions", k, verFy, sObj.monthName, expBasicProrated, expDaProrated, sObj.slip);
          if (tempExp !== null) expVal = tempExp;
        }
        
        expectedSum += expVal;
      });
      
      const diff = actualSum - expectedSum;
      const isDiff = Math.abs(diff) > 10 && actualSum > 0;
      const row = document.createElement('tr');
      if (isDiff) {
        row.className = 'diff-highlight';
      }
      row.innerHTML = `
        <td>${ercDisplayNames[k] || k.replace("erc_", "ERC ").toUpperCase()}</td>
        <td class="numeric">${formatNumber(actualSum)}</td>
        <td class="numeric">${formatNumber(expectedSum)}</td>
        <td class="numeric">${isDiff ? formatNumber(diff) : '0.00'}</td>
      `;
      ercTbody.appendChild(row);
    });
  } else {
    // Monthly ERC comparison
    const allErcKeys = new Set(Object.keys(slip.metadata).filter(k => k.startsWith("erc_")));
    ruleVars.filter(v => v.type === "Employer Contributions").forEach(v => allErcKeys.add(v.name));

    const seenNormErc2 = new Set();
    allErcKeys.forEach(k => {
      const norm = normalizeComponentName(k);
      if (seenNormErc2.has(norm)) return;
      seenNormErc2.add(norm);

      const act = slip.metadata[k] || 0;
      const isUnexplained = isComponentUnexplained("Employer Contributions", k);
      let exp = isUnexplained ? 0 : act;
      
      if (!isUnexplained) {
        const tempExp = getExpectedComponentValue("Employer Contributions", k, verFy, month, expectedBasicProrated, expectedDaProrated, slip);
        if (tempExp !== null) exp = tempExp;
      }
      
      const diff = act - exp;
      const isDiff = Math.abs(diff) > 5 && act > 0;

      const row = document.createElement('tr');
      if (isDiff) {
        row.className = 'diff-highlight';
      }
      
      row.innerHTML = `
        <td>${ercDisplayNames[k] || k.replace("erc_", "ERC ").toUpperCase()}</td>
        <td class="numeric">${formatNumber(act)}</td>
        <td class="numeric">${formatNumber(exp)}</td>
        <td class="numeric">${isDiff ? formatNumber(diff) : '0.00'}</td>
      `;
      ercTbody.appendChild(row);
    });
  }

  // Render YTD / Perks Verification Table (Remains the same as these are inherently cumulative/current status)
  const ytdTbody = document.getElementById('ytdCompareTable').querySelector('tbody');
  ytdTbody.innerHTML = '';
  
  // Calculate expected YTD values chronologically (using formula rules)
  const expectedYtdPay = calculateExpectedYtdValue("PAY", verFy, month);
  const expectedYtdDa = calculateExpectedYtdValue("DA", verFy, month);
  const expectedYtdHra = calculateExpectedYtdValue("HRA", verFy, month);
  const expectedYtdCmre = calculateExpectedYtdValue("CMRE", verFy, month);
  const expectedYtdCpf = calculateExpectedYtdValue("CPF", verFy, month);
  const expectedYtdCss = calculateExpectedYtdValue("CSSS", verFy, month);
  const expectedYtdPTax = calculateExpectedYtdValue("P. Tax", verFy, month);
  const expectedYtdITax = calculateExpectedYtdValue("I. Tax", verFy, month);
  const expectedYtdEecPrbs = calculateExpectedYtdValue("Eec PRBS", verFy, month);
  const expectedYtdErcPrbs = calculateExpectedYtdValue("Erc PRBS", verFy, month);
  const expectedYtdErcNps = calculateExpectedYtdValue("Erc NPS", verFy, month);
  const expectedYtdEecNps = calculateExpectedYtdValue("EEC NPS", verFy, month);
  const expectedYtdHcmrs = calculateExpectedYtdValue("HCMRS sch", verFy, month);
  const expectedYtdTotalIncome = calculateExpectedYtdTotalIncome(verFy, month);
  const expectedYtdTaxableIncome = expectedYtdTotalIncome - calculateExpectedYtdValue("Other(NT)", verFy, month);

  // Form 16 Std Deduction & Ded us 80
  const expectedStdDed = parseInt(slip.metadata.year) >= 2025 ? 75000 : 50000;
  const expectedF16Income = ((slip.form16 && slip.form16["Gross Sal"]) || 0) > 0
    ? ((slip.form16 && slip.form16["Gross Sal"]) || 0) - expectedStdDed
    : ((slip.form16 && slip.form16["Income"]) || 0);
  
  const mIdx = monthOrder.indexOf(month);
  const remainingMonths = 11 - mIdx;
  const baseNps = (slip.metadata.erc_nps || 0) - (slip.earnings["Arr.Variable DA"] || 0) * 0.14;
  const expectedDed80 = (slip.metadata.erc_nps || 0) > 0 ? (expectedYtdErcNps + Math.round(baseNps) * remainingMonths) : 0;

  // Loan Verification details
  let expectedLoanInstl = 0;
  let expectedLoanBal = 0;
  let expectedLoanInt = 0;
  const currentCarLoan = slip.loans && slip.loans["Car/4 Wheeler"];
  if (currentCarLoan) {
    expectedLoanInstl = 6250;
    const prevLoanSlip = getPreviousChronologicalLoanSlip(verFy, month);
    if (prevLoanSlip) {
      const prevPeriod = prevLoanSlip.period;
      const prevBal = prevLoanSlip.slip.loans["Car/4 Wheeler"].balance;
      const prevInt = prevLoanSlip.slip.loans["Car/4 Wheeler"].accrued_interest;
      
      const fyStartYear = parseInt(verFy.split('-')[0]);
      const calYear = fyStartYear + (mIdx >= 9 ? 1 : 0);
      const calMonth = (mIdx + 3) % 12;
      const currentPeriod = calYear * 12 + calMonth;
      const elapsed = currentPeriod - prevPeriod;
      
      expectedLoanBal = prevBal - 6250 * elapsed;
      expectedLoanInt = prevInt;
      for (let i = 0; i < elapsed; i++) {
        expectedLoanInt += (prevBal - 6250 * i) / 300;
      }
    } else {
      expectedLoanBal = currentCarLoan.balance;
      expectedLoanInt = currentCarLoan.accrued_interest;
    }
  }

  const ytdItems = [
    { name: "YTD PAY (Basic)", act: (slip.ytd_earnings && slip.ytd_earnings["PAY"]) || 0, exp: expectedYtdPay },
    { name: "YTD DA (Variable)", act: (slip.ytd_earnings && slip.ytd_earnings["DA"]) || 0, exp: expectedYtdDa },
    { name: "YTD HRA (Rent Allow)", act: (slip.ytd_earnings && slip.ytd_earnings["HRA"]) || 0, exp: expectedYtdHra },
    { name: "YTD CMRE", act: (slip.ytd_earnings && slip.ytd_earnings["CMRE"]) || 0, exp: expectedYtdCmre },
    { name: "YTD CPF (Employee)", act: (slip.ytd_deductions && slip.ytd_deductions["CPF"]) || 0, exp: expectedYtdCpf },
    { name: "YTD CSSS (CSS Scheme)", act: (slip.ytd_deductions && slip.ytd_deductions["CSSS"]) || 0, exp: expectedYtdCss },
    { name: "YTD P. Tax (Prof)", act: (slip.ytd_deductions && slip.ytd_deductions["P. Tax"]) || 0, exp: expectedYtdPTax },
    { name: "YTD I. Tax (Income)", act: (slip.ytd_deductions && slip.ytd_deductions["I. Tax"]) || 0, exp: expectedYtdITax },
    { name: "YTD Eec PRBS (Emp)", act: (slip.ytd_deductions && slip.ytd_deductions["Eec PRBS"]) || 0, exp: expectedYtdEecPrbs },
    { name: "YTD Erc PRBS (Emplr)", act: (slip.ytd_deductions && slip.ytd_deductions["Erc PRBS"]) || 0, exp: expectedYtdErcPrbs },
    { name: "YTD Erc NPS (Emplr)", act: (slip.ytd_deductions && slip.ytd_deductions["Erc NPS"]) || (slip.ytd_earnings && slip.ytd_earnings["Erc NPS"]) || 0, exp: expectedYtdErcNps },
    { name: "YTD EEC NPS (Employee)", act: (slip.ytd_deductions && slip.ytd_deductions["EEC NPS"]) || 0, exp: expectedYtdEecNps },
    { name: "YTD HCMRS sch", act: (slip.ytd_deductions && slip.ytd_deductions["HCMRS sch"]) || 0, exp: expectedYtdHcmrs },
    { name: "YTD Total Income (Tot Incm)", act: (slip.ytd_deductions && slip.ytd_deductions["Tot Incm"]) || 0, exp: expectedYtdTotalIncome },
    { name: "YTD Taxable Income (Tax Incm)", act: (slip.ytd_deductions && slip.ytd_deductions["Tax Incm"]) || 0, exp: expectedYtdTaxableIncome },
    { name: "Perk: Housing Valuation", act: (slip.perks && slip.perks["Housing"]) || 0, exp: getExpectedComponentValue("Perks", "Housing", verFy, month, expectedBasic, expectedDa, slip) || 0 },
    { name: "Perk: Int Loan Value", act: (slip.perks && slip.perks["Int Loan"]) || 0, exp: getExpectedComponentValue("Perks", "Int Loan", verFy, month, expectedBasic, expectedDa, slip) || 0 },
    { name: "Perk: Asset Tra", act: (slip.perks && slip.perks["Asset Tra"]) || 0, exp: getExpectedComponentValue("Perks", "Asset Tra", verFy, month, expectedBasic, expectedDa, slip) || 0 },
    { name: "Car Loan Installment", act: currentCarLoan ? currentCarLoan.installment : 0, exp: expectedLoanInstl },
    { name: "Car Loan Balance", act: currentCarLoan ? currentCarLoan.balance : 0, exp: expectedLoanBal },
    { name: "Car Loan Accrued Interest", act: currentCarLoan ? currentCarLoan.accrued_interest : 0, exp: expectedLoanInt },
    { name: "Form 16 Gross Salary", act: (slip.form16 && slip.form16["Gross Sal"]) || 0, exp: (slip.form16 && slip.form16["Gross Sal"]) || 0 },
    { name: "Form 16 Std Deduction", act: (slip.form16 && slip.form16["Std Dedn"]) || 0, exp: expectedStdDed },
    { name: "Form 16 Taxable Income", act: (slip.form16 && slip.form16["Income"]) || 0, exp: expectedF16Income },
    { name: "Form 16 Ded us 80 (Sec 80CCD)", act: (slip.form16 && slip.form16["Ded us 80"]) || 0, exp: expectedDed80 }
  ];

  ytdItems.forEach(item => {
    if (item.act === 0 && item.exp === 0) return;
    const diff = item.act - item.exp;
    const isDiff = Math.abs(diff) > 10;
    
    const row = document.createElement('tr');
    if (isDiff) {
      row.className = 'diff-highlight';
    }
    
    row.innerHTML = `
      <td>${item.name}</td>
      <td class="numeric">${formatNumber(item.act)}</td>
      <td class="numeric">${formatNumber(item.exp)}</td>
      <td class="numeric">${isDiff ? formatNumber(diff) : '0.00'}</td>
    `;
    ytdTbody.appendChild(row);
  });

  updateTopKpiCards();
};

function updateTopKpiCards() {
  const verFy = document.getElementById('verFySelector').value;
  const month = activeMonthAudit;
  const mode = auditMode || 'monthly';
  
  if (!salaryDb[verFy]) return;

  if (!month) {
    document.getElementById('verDiscrepanciesCount').innerText = '0';
    document.getElementById('verRecoveriesTotal').innerText = formatINR(0);
    document.querySelector('.discrepancy-card .kpi-subtitle').innerText = 'Differences from formula';
    document.querySelector('.recovery-card .kpi-subtitle').innerText = 'Unexplained items not in formula';
    return;
  }

  if (mode === 'monthly') {
    const auditObj = auditDiscrepancies.find(a => a.month === month);
    const discCount = auditObj ? auditObj.discrepancies.length : 0;
    
    let recoveriesSum = 0;
    const unexplainedItems = getUnexplainedItems(verFy, month);
    unexplainedItems.forEach(item => {
      if (item.category === "Earnings" || item.category === "Deductions" || item.category === "Employer Contributions") {
        recoveriesSum += item.value;
      }
    });
    
    document.getElementById('verDiscrepanciesCount').innerText = discCount;
    document.getElementById('verRecoveriesTotal').innerText = formatINR(recoveriesSum);
    document.querySelector('.discrepancy-card .kpi-subtitle').innerText = `Differences from formula in ${month}`;
    document.querySelector('.recovery-card .kpi-subtitle').innerText = `Unexplained items in ${month}`;
  } else {
    const selectedMonthIdx = monthOrder.indexOf(month);
    const ytdMonthsList = monthOrder.slice(0, selectedMonthIdx + 1);
    
    let totalDiscCount = 0;
    let totalRecoveriesSum = 0;
    
    ytdMonthsList.forEach(m => {
      const auditObj = auditDiscrepancies.find(a => a.month === m);
      if (auditObj) {
        totalDiscCount += auditObj.discrepancies.length;
      }
      
      const unexplainedItems = getUnexplainedItems(verFy, m);
      unexplainedItems.forEach(item => {
        if (item.category === "Earnings" || item.category === "Deductions" || item.category === "Employer Contributions") {
          totalRecoveriesSum += item.value;
        }
      });
    });
    
    document.getElementById('verDiscrepanciesCount').innerText = totalDiscCount;
    document.getElementById('verRecoveriesTotal').innerText = formatINR(totalRecoveriesSum);
    document.querySelector('.discrepancy-card .kpi-subtitle').innerText = `Cumulative differences (April - ${month})`;
    document.querySelector('.recovery-card .kpi-subtitle').innerText = `Cumulative unexplained items (April - ${month})`;
  }
}

// Pad helper functions
function padRight(str, len, noTruncate = false) {
  str = (str === undefined || str === null) ? "" : str.toString();
  if (str.length >= len) {
    return noTruncate ? str : str.slice(0, len);
  }
  return str + " ".repeat(len - str.length);
}

function padLeft(str, len, noTruncate = false) {
  str = (str === undefined || str === null) ? "" : str.toString();
  if (str.length >= len) {
    return noTruncate ? str : str.slice(0, len);
  }
  return " ".repeat(len - str.length) + str;
}

function formatPayslipVal(val) {
  if (val === undefined || val === null || val === "") return "";
  const num = parseFloat(val);
  if (isNaN(num)) return val.toString();
  if (num < 0) {
    return Math.abs(num).toFixed(2) + "-";
  }
  return num.toFixed(2);
}

function formatYTDVal(val) {
  if (val === undefined || val === null || val === "") return "";
  const num = parseFloat(val);
  if (isNaN(num)) return val.toString();
  return Math.round(num).toLocaleString('en-IN');
}

// Generate high-fidelity 80-column ASCII payslip replica text
function generateAsciiPayslipText(basic, daRate, month, fy, dummySlip, totEarn, totDedn, netPay, projectedGross, expectedStdDed, projectedIncome, projectedDed80, projectedTaxPayable, lastMeta) {
  const name = lastMeta.name || "AMRINDER SINGH";
  const cpf_no = lastMeta.cpf_no || "135833";
  const bill = lastMeta.bill || "242";
  const desgn = lastMeta.designation || "Executive Engineer ( Instrumentation )";
  const unit = lastMeta.unit || "CAMBAY SURFACE";
  const position = lastMeta.position || "INSTT EXE  EPS ANKL";
  const pan = lastMeta.pan || "HMVPS9491F";
  const payscale = lastMeta.payscale || "70,000 -   200,000";
  const dob = lastMeta.dob || "01.08.1993";
  const doj = lastMeta.doj || "26.09.2018";
  const last_promo = lastMeta.last_promotion || "01.01.2023";
  const bankAcc = lastMeta.bank_acc || "SBIN020320049147";
  const position_id = lastMeta.position_id || "70141432";
  const org_key = lastMeta.org_key || "CAMB150005331";
  const retro_date = lastMeta.retro_date || "01.01.2022";
  const serial_no = lastMeta.serial_no || "15";

  let lines = [];
  
  // Header
  lines.push("                      OIL AND NATURAL GAS CORPORATION LTD.");
  lines.push("                                    CAMBAY");
  lines.push(padRight(`                       PAY SLIP FOR THE MONTH OF ${month} ${fy.split('-')[0]}`, 71) + "SR.NO  " + serial_no);
  lines.push(" ______________________________________________________________________________");
  
  // Box 1: Employee details
  let row1 = "| NAME     " + padRight(name, 35) + "CPF NO.  " + padRight(cpf_no, 8) + "BILL " + padRight(bill, 10) + " |";
  lines.push(row1);
  
  let row2 = "| DESGN    " + padRight(desgn, 40) + "UNIT   " + padRight(unit, 20) + " |";
  lines.push(row2);
  
  let row3 = "| POSITION  " + padRight(position, 36) + "PAN NUMBER " + padRight(pan, 19) + " |";
  lines.push(row3);
  
  let row4 = "| PAYSCALE " + padRight(payscale, 22) + "PAY RATE " + padRight(formatYTDVal(basic), 10, true) + padRight("  EPS-", 26) + " |";
  lines.push(row4);
  
  lines.push("|______________________________________________________________________________|");
  
  // Box 2: ERC contributions and dates
  let ercEps = dummySlip.metadata.erc_eps || 0;
  let ercNps = dummySlip.metadata.erc_nps || 0;
  let row5 = "| ERC-EPS " + padLeft(formatPayslipVal(ercEps), 8, true) + "   ERC-NPS " + padLeft(formatPayslipVal(ercNps), 9, true) + "       DATE OF BIRTH          " + padRight(dob, 10) + " |";
  lines.push(row5);
  
  let ercPrbs = dummySlip.metadata.erc_prbs || 0;
  let row6 = "| ERC-PRBS" + padLeft(formatPayslipVal(ercPrbs), 19, true) + "                DATE OF JOINING        " + padRight(doj, 10) + " |";
  lines.push(row6);
  
  let ercCpf = dummySlip.metadata.erc_cpf || 0;
  let ercCsss = dummySlip.metadata.erc_csss || 0;
  let row7 = "| ERC-CPF " + padRight(formatPayslipVal(ercCpf), 10, true) + "  ERC-CSSS " + padRight(formatPayslipVal(ercCsss), 8, true) + "      DATE OF LAST PROMOTION " + padRight(last_promo, 10) + " |";
  lines.push(row7);
  
  let row8 = "| BANK ACCOUNT NO. " + padRight(bankAcc, 25) + "Position               " + padRight(position_id, 11) + " |";
  lines.push(row8);
  
  let row9 = "| Org. Key           " + padRight(org_key, 24) + "EARLIEST RETRO DATE    " + padRight(retro_date, 10) + " |";
  lines.push(row9);
  
  lines.push("|______________________________________________________________________________|");
  
  // Earnings / Deductions Columns
  lines.push("|        EARNINGS           |       DEDUCTIONS          |EXEMPTION/OTHER INCOME|");
  lines.push("|___________________________|___________________________|______________________|");
  
  // Gather active earnings and deductions for display
  const activeEarns = [];
  Object.keys(dummySlip.earnings).forEach(k => {
    const val = dummySlip.earnings[k];
    if (val !== 0) activeEarns.push({ name: k, val: val });
  });
  
  const activeDeds = [];
  Object.keys(dummySlip.deductions).forEach(k => {
    const val = dummySlip.deductions[k];
    if (val !== 0) activeDeds.push({ name: k, val: val });
  });
  
  const maxRows = Math.max(activeEarns.length, activeDeds.length, 6);
  
  for (let i = 0; i < maxRows; i++) {
    let earnPart = "                           "; // 27 chars
    if (i < activeEarns.length) {
      const item = activeEarns[i];
      earnPart = padRight(item.name, 17) + padLeft(formatPayslipVal(item.val), 9, true) + " ";
    }
    
    let dedPart = "                           "; // 27 chars
    if (i < activeDeds.length) {
      const item = activeDeds[i];
      dedPart = padRight(item.name, 17) + padLeft(formatPayslipVal(item.val), 9, true) + " ";
    }
    
    let rightPart = "                      "; // 22 chars
    const totalRowStartIdx = maxRows - 4;
    if (i === totalRowStartIdx) {
      rightPart = "----------------------";
    } else if (i === totalRowStartIdx + 1) {
      rightPart = padRight("TOT EARN.", 10) + padLeft(formatPayslipVal(totEarn), 10, true) + "  ";
    } else if (i === totalRowStartIdx + 2) {
      rightPart = padRight("TOT DEDN.", 10) + padLeft(formatPayslipVal(totDedn), 10, true) + "  ";
    } else if (i === totalRowStartIdx + 3) {
      rightPart = padRight("NET PAY", 10) + padLeft(formatPayslipVal(netPay), 10, true) + "  ";
    }
    
    lines.push("|" + earnPart + "|" + dedPart + "|" + rightPart + "|");
  }
  lines.push("|___________________________|___________________________|______________________|");
  
  // Loans block
  lines.push("| LOAN TYPE                                INSTL       BALANCE       ACC.INTRST|");
  lines.push("|______________________________________________________________________________|");
  
  let carLoanInstl = 0;
  let carLoanBal = 0;
  let carLoanInt = 0;
  
  const _carVars1 = getVariablesForFy(fy);
  const carLoanRule = _carVars1.find(v => v.name === "Car/4 Wheeler" || v.name === "Car loan Installment");
  if (carLoanRule) {
    carLoanInstl = 6250;
    const slips = getChronologicalSlips();
    const monthIdx = monthOrder.indexOf(month);
    const fyStartYear = parseInt(fy.split('-')[0]);
    const calYear = fyStartYear + (monthIdx >= 9 ? 1 : 0);
    const calMonth = (monthIdx + 3) % 12;
    const targetPeriod = calYear * 12 + calMonth;
    
    const pastLoanSlips = slips.filter(s => s.period < targetPeriod && s.slip.loans && s.slip.loans["Car/4 Wheeler"]);
    if (pastLoanSlips.length > 0) {
      const prevLoanObj = pastLoanSlips[pastLoanSlips.length - 1];
      const prevPeriod = prevLoanObj.period;
      const prevBal = prevLoanObj.slip.loans["Car/4 Wheeler"].balance;
      const prevInt = prevLoanObj.slip.loans["Car/4 Wheeler"].accrued_interest;
      const elapsed = targetPeriod - prevPeriod;
      
      carLoanBal = prevBal - 6250 * elapsed;
      carLoanInt = prevInt;
      for (let i = 0; i < elapsed; i++) {
        carLoanInt += (prevBal - 6250 * i) / 300;
      }
    } else {
      carLoanBal = 500000;
      carLoanInt = 60000;
    }
  }
  
  if (carLoanInstl > 0) {
    let loanRow = "| " + padRight("Car/4 Wheeler", 28) + padLeft(formatPayslipVal(carLoanInstl), 16, true) + padLeft(formatPayslipVal(carLoanBal), 16, true) + padLeft(formatPayslipVal(carLoanInt), 16, true) + " |";
    lines.push(loanRow);
  } else {
    lines.push("|                                                                              |");
  }
  lines.push("|______________________________________________________________________________|");
  
  // YTD Block
  lines.push("|           YTD EARNINGS               |           YTD DEDUCTIONS              |");
  lines.push("|______________________________________|_______________________________________|");
  
  const monthIdx = monthOrder.indexOf(month);
  const numMonths = monthIdx + 1;
  const daVal = Math.round(basic * (daRate / 100) * 100) / 100;
  
  const ytd_pay = basic * numMonths;
  const ytd_da_val = daVal * numMonths;
  const ytd_hra = (dummySlip.earnings["House Rent Allow"] || 0) * numMonths;
  const ytd_cmre = (dummySlip.earnings["CMRE"] || 0) * numMonths;
  const ytd_other_t = (totEarn - basic - daVal - (dummySlip.earnings["House Rent Allow"] || 0) - (dummySlip.earnings["CMRE"] || 0) - (dummySlip.earnings["Maint charge WG"] || 0)) * numMonths;
  const ytd_other_nt = (dummySlip.earnings["Maint charge WG"] || 0) * numMonths;
  const ytd_other_pay = (dummySlip.earnings["Uniform Reimb"] || 0) * numMonths;
  const ytd_prev_yrs = 0;
  const ytd_erc_prbs_ded = (dummySlip.metadata.erc_prbs || 0) * numMonths;
  
  const ytd_cpf = (dummySlip.deductions["CPF EEC"] || 0) * numMonths;
  const ytd_csss = (dummySlip.deductions["CSS Scheme"] || 0) * numMonths;
  const ytd_wg_rent = (dummySlip.deductions["White goods Rent"] || dummySlip.deductions["WG Rent"] || 0) * numMonths;
  const ytd_eec_prbs = (dummySlip.deductions["Emp PRBS contrib"] || 0) * numMonths;
  const ytd_erc_prbs_ded2 = (dummySlip.metadata.erc_prbs || 0) * numMonths;
  const ytd_i_tax = (dummySlip.deductions["Income Tax"] || 0) * numMonths;
  const ytd_eec_nps = (dummySlip.deductions["NPS EEC"] || 0) * numMonths;
  const ytd_erc_nps = (dummySlip.metadata.erc_nps || 0) * numMonths;
  const ytd_p_tax = (dummySlip.deductions["Prof Tax"] || 0) * numMonths;
  const ytd_hcmrs_sch = (dummySlip.deductions["HCMRS Ins Scheme"] || 0) * numMonths;
  const ytd_tot_incm = totEarn * numMonths;
  const ytd_tax_incm = (totEarn - (dummySlip.earnings["Maint charge WG"] || 0)) * numMonths;
  
  const ytdRows = [
    { s1: "PAY", v1: ytd_pay, s2: "Other (T)", v2: ytd_other_t, s3: "CPF", v3: ytd_cpf, s4: "P. Tax", v4: ytd_p_tax },
    { s1: "DA", v1: ytd_da_val, s2: "Other(NT)", v2: ytd_other_nt, s3: "CSSS", v3: ytd_csss, s4: "HCMRS sch", v4: ytd_hcmrs_sch },
    { s1: "HRA", v1: ytd_hra, s2: "Other Pay", v2: ytd_other_pay, s3: "WG Rent", v3: ytd_wg_rent, s4: "Tot Incm", v4: ytd_tot_incm },
    { s1: "CMRE", v1: ytd_cmre, s2: "Prev.Yrs.", v2: ytd_prev_yrs, s3: "Eec PRBS", v3: ytd_eec_prbs, s4: "Tax Incm", v4: ytd_tax_incm },
    { s1: "", v1: null, s2: "Erc PRBS", v2: ytd_erc_prbs_ded, s3: "Erc PRBS", v3: ytd_erc_prbs_ded2, s4: "", v4: null },
    { s1: "", v1: null, s2: "", v2: null, s3: "I. Tax", v3: ytd_i_tax, s4: "", v4: null },
    { s1: "", v1: null, s2: "", v2: null, s3: "EEC NPS", v3: ytd_eec_nps, s4: "", v4: null },
    { s1: "", v1: null, s2: "", v2: null, s3: "Erc NPS", v3: ytd_erc_nps, s4: "", v4: null }
  ];
  
  ytdRows.forEach(r => {
    let col1 = "                   ";
    if (r.s1) col1 = padRight(r.s1, 8) + padLeft(formatYTDVal(r.v1), 10, true) + " ";
    
    let col2 = "                  ";
    if (r.s2) col2 = padRight(r.s2, 8) + padLeft(formatYTDVal(r.v2), 9, true) + " ";
    
    let col3 = "                   ";
    if (r.s3) col3 = padRight(r.s3, 8) + padLeft(formatYTDVal(r.v3), 10, true) + " ";
    
    let col4 = "                   ";
    if (r.s4) col4 = padRight(r.s4, 8) + padLeft(formatYTDVal(r.v4), 10, true) + " ";
    
    lines.push("|" + col1 + "|" + col2 + "|" + col3 + "|" + col4 + "|");
  });
  
  lines.push("|______________________________________|_______________________________________|");
  
  // Perks, Savings, Form 16 Block
  lines.push("|     PERKS        |  SAVINGS SEC80C   |                FORM 16                |");
  lines.push("|__________________|___________________|_______________________________________|");
  
  const perks_savings_f16 = [
    { p: "Int Loan", pv: 28984, s: "", sv: null, f1: "Gross Sal", f1v: projectedGross, f2: "I.Tax&Sur", f2v: Math.round(projectedTaxPayable * 1.09) },
    { p: "Housing", pv: Math.round(totEarn * 0.1), s: "", sv: null, f1: "Income", f1v: projectedIncome, f2: "Tax Payab", f2v: projectedTaxPayable },
    { p: "Asset Tra", pv: 0, s: "", sv: null, f1: "Std Dedn", f1v: expectedStdDed, f2: "", f2v: null },
    { p: "", pv: null, s: "", sv: null, f1: "Ded us 80", f1v: projectedDed80, f2: "", f2v: null }
  ];
  
  perks_savings_f16.forEach(r => {
    let pCol = "                  ";
    if (r.p) pCol = padRight(r.p, 9) + padLeft(formatYTDVal(r.pv), 8, true) + " ";
    
    let sCol = "                   ";
    if (r.s) sCol = padRight(r.s, 10) + padLeft(formatYTDVal(r.sv), 8, true) + " ";
    
    let f1Col = "                   ";
    if (r.f1) f1Col = padRight(r.f1, 9) + padLeft(formatYTDVal(r.f1v), 9, true) + " ";
    
    let f2Col = "                   ";
    if (r.f2) f2Col = padRight(r.f2, 9) + padLeft(formatYTDVal(r.f2v), 9, true) + " ";
    
    lines.push("|" + pCol + "|" + sCol + "|" + f1Col + "|" + f2Col + "|");
  });
  lines.push("|__________________|___________________|_______________________________________|");
  
  return lines.join("\n");
}

let projViewMode = 'dashboard';
function changeProjView(mode) {
  projViewMode = mode;
  const dbBtn = document.getElementById('projBtnDashboard');
  const repBtn = document.getElementById('projBtnReplica');
  const dbPanel = document.getElementById('projPanelDashboard');
  const repPanel = document.getElementById('projPanelReplica');
  
  if (dbBtn && repBtn) {
    if (mode === 'dashboard') {
      dbBtn.classList.add('active');
      dbBtn.style.color = 'var(--text-primary)';
      dbBtn.style.background = 'rgba(255,255,255,0.08)';
      
      repBtn.classList.remove('active');
      repBtn.style.color = 'var(--text-secondary)';
      repBtn.style.background = 'none';
      
      if (dbPanel) dbPanel.style.display = 'block';
      if (repPanel) repPanel.style.display = 'none';
    } else {
      repBtn.classList.add('active');
      repBtn.style.color = 'var(--text-primary)';
      repBtn.style.background = 'rgba(255,255,255,0.08)';
      
      dbBtn.classList.remove('active');
      dbBtn.style.color = 'var(--text-secondary)';
      dbBtn.style.background = 'none';
      
      if (dbPanel) dbPanel.style.display = 'none';
      if (repPanel) repPanel.style.display = 'block';
    }
  }
}

// Calculate salary projections sandbox
// Calculate salary projections sandbox and render replica payslip
function calculateProjection() {
  const _projVars = getVariablesForFy(document.getElementById('projFy') ? document.getElementById('projFy').value : getActiveFY());
  const basicRule = _projVars.find(v => v.name === "Basic Pay");
  const daRule = _projVars.find(v => v.name === "Variable DA");
  
  const basic = basicRule ? parseFloat(basicRule.formula) : 0;
  const daRate = daRule ? parseFloat(daRule.formula) : (formulaRules.ruleDA || 0);
  
  const month = document.getElementById('projMonth').value;
  const fy = document.getElementById('projFy').value;
  
  console.error("calculateProjection running:", {
    basicRule,
    daRule,
    basic,
    daRate,
    month,
    fy
  });
  
  if (isNaN(basic) || isNaN(daRate) || basic <= 0) {
    alert("Please configure valid figures for Basic Pay and Variable DA in Manage Formula Rules.");
    return;
  }

  const daVal = Math.round(basic * (daRate / 100) * 100) / 100;
  
  // Seed last known Emplyr paid ITax from actual slip history for Cafeteria Adj-HP calculation
  const lastKnownEmplyrITax = (() => {
    const slips = getChronologicalSlips();
    for (let i = slips.length - 1; i >= 0; i--) {
      const val = slips[i].slip.deductions && slips[i].slip.deductions["Emplyr paid ITax"];
      if (val && val > 0) return val;
    }
    return 0;
  })();
  
  // Build a dummy slip representation
  const dummySlip = {
    earnings: {
      "Basic Pay": basic,
      "Variable DA": daVal
    },
    deductions: {
      // Seed with last known employer-paid income tax so Cafeteria Adj-HP projects correctly
      ...(lastKnownEmplyrITax > 0 ? { "Emplyr paid ITax": lastKnownEmplyrITax } : {})
    },
    metadata: {
      year: fy.split('-')[0],
      erc_eps: 0,
      erc_nps: 0,
      erc_prbs: 0,
      erc_cpf: 0,
      erc_csss: 0
    },
    perks: {},
    loans: {},
    form16: {}
  };
  
  // Evaluate active variables for this month
  const earningsList = [];
  const deductionsList = [];
  const ercList = [];
  
  let totEarn = 0;
  let totDedn = 0;
  
  // Evaluate earnings variables
  const earningsVars = _projVars.filter(v => v.type === "Earnings");
  earningsVars.forEach(v => {
    if (v.name === "Basic Pay" || v.name === "Variable DA") return;
    const val = getExpectedComponentValue("Earnings", v.name, fy, month, basic, daVal, dummySlip);
    if (val !== null && val !== 0) {
      dummySlip.earnings[v.name] = val;
    }
  });
  
  // Collect earnings
  Object.keys(dummySlip.earnings).forEach(k => {
    const val = dummySlip.earnings[k];
    totEarn += val;
    earningsList.push({ name: k, value: val });
  });
  
  // Evaluate deductions variables
  const deductionsVars = _projVars.filter(v => v.type === "Deductions");
  deductionsVars.forEach(v => {
    const val = getExpectedComponentValue("Deductions", v.name, fy, month, basic, daVal, dummySlip);
    if (val !== null && val !== 0) {
      dummySlip.deductions[v.name] = val;
    }
  });
  
  // Income Tax estimate fallback
  if (dummySlip.deductions["Income Tax"] === undefined || dummySlip.deductions["Income Tax"] === 0) {
    const estTax = Math.round(totEarn * 0.12 * 100) / 100;
    dummySlip.deductions["Income Tax"] = estTax;
  }
  
  // Collect deductions
  Object.keys(dummySlip.deductions).forEach(k => {
    const val = dummySlip.deductions[k];
    totDedn += val;
    deductionsList.push({ name: k, value: val });
  });
  
  const netPay = totEarn - totDedn;
  
  // Evaluate Employer Contributions
  const ercVars = _projVars.filter(v => v.type === "Employer Contributions");
  ercVars.forEach(v => {
    const val = getExpectedComponentValue("Employer Contributions", v.name, fy, month, basic, daVal, dummySlip);
    if (val !== null) {
      dummySlip.metadata[v.name] = val;
      ercList.push({ name: v.name, value: val });
    }
  });

  // Loans details for projected month
  let carLoanInstl = 0;
  let carLoanBal = 0;
  let carLoanInt = 0;
  const carLoanRule = _projVars.find(v => v.name === "Car/4 Wheeler" || v.name === "Car loan Installment");
  if (carLoanRule) {
    carLoanInstl = isNaN(parseFloat(carLoanRule.formula)) ? 6250 : parseFloat(carLoanRule.formula);
    const slips = getChronologicalSlips();
    const monthIdx = monthOrder.indexOf(month);
    const fyStartYear = parseInt(fy.split('-')[0]);
    const calYear = fyStartYear + (monthIdx >= 9 ? 1 : 0);
    const calMonth = (monthIdx + 3) % 12;
    const targetPeriod = calYear * 12 + calMonth;
    
    const pastLoanSlips = slips.filter(s => s.period < targetPeriod && s.slip.loans && s.slip.loans["Car/4 Wheeler"]);
    if (pastLoanSlips.length > 0) {
      const prevLoanObj = pastLoanSlips[pastLoanSlips.length - 1];
      const prevPeriod = prevLoanObj.period;
      const prevBal = prevLoanObj.slip.loans["Car/4 Wheeler"].balance;
      const prevInt = prevLoanObj.slip.loans["Car/4 Wheeler"].accrued_interest;
      const elapsed = targetPeriod - prevPeriod;
      
      carLoanBal = prevBal - carLoanInstl * elapsed;
      carLoanInt = prevInt;
      for (let i = 0; i < elapsed; i++) {
        carLoanInt += (prevBal - carLoanInstl * i) / 300;
      }
    } else {
      carLoanBal = 500000;
      carLoanInt = 60000;
    }
  }

  // YTD Multiplier
  const monthIdx = monthOrder.indexOf(month);
  const numMonths = monthIdx + 1;

  // Helper to match dynamic key names
  const findKey = (list, patterns) => {
    return Object.keys(list).find(k => patterns.some(p => k.toLowerCase().includes(p.toLowerCase()))) || "";
  };

  const hraKey = findKey(dummySlip.earnings, ["House Rent Allow", "HRA"]);
  const cmreKey = findKey(dummySlip.earnings, ["CMRE"]);
  const wgMaintKey = findKey(dummySlip.earnings, ["Maint charge WG", "WG Maint"]);
  const uniformKey = findKey(dummySlip.earnings, ["Uniform Reimb", "Uniform"]);

  const cpfKey = findKey(dummySlip.deductions, ["CPF EEC", "CPF"]);
  const csssKey = findKey(dummySlip.deductions, ["CSS Scheme", "CSSS"]);
  const wgRentKey = findKey(dummySlip.deductions, ["White goods Rent", "WG Rent"]);
  const prbsKey = findKey(dummySlip.deductions, ["Emp PRBS contrib", "PRBS contrib", "PRBS"]);

  const ytd_pay = basic * numMonths;
  const ytd_da_val = daVal * numMonths;
  const ytd_hra = (hraKey ? dummySlip.earnings[hraKey] : 0) * numMonths;
  const ytd_cmre = (cmreKey ? dummySlip.earnings[cmreKey] : 0) * numMonths;
  const ytd_other_t = (totEarn - basic - daVal - (hraKey ? dummySlip.earnings[hraKey] : 0) - (cmreKey ? dummySlip.earnings[cmreKey] : 0) - (wgMaintKey ? dummySlip.earnings[wgMaintKey] : 0)) * numMonths;
  const ytd_other_nt = (wgMaintKey ? dummySlip.earnings[wgMaintKey] : 0) * numMonths;
  const ytd_other_pay = (uniformKey ? dummySlip.earnings[uniformKey] : 0) * numMonths;

  const ytd_cpf = (cpfKey ? dummySlip.deductions[cpfKey] : 0) * numMonths;
  const ytd_csss = (csssKey ? dummySlip.deductions[csssKey] : 0) * numMonths;
  const ytd_wg_rent = (wgRentKey ? dummySlip.deductions[wgRentKey] : 0) * numMonths;
  const ytd_eec_prbs = (prbsKey ? dummySlip.deductions[prbsKey] : 0) * numMonths;
  const ytd_tot_incm = totEarn * numMonths;
  const ytd_tax_incm = (totEarn - (wgMaintKey ? dummySlip.earnings[wgMaintKey] : 0)) * numMonths;

  // Perks & Loans estimation
  const perksList = [];
  const perksVars = _projVars.filter(v => v.type === "Perks");
  perksVars.forEach(v => {
    const val = getExpectedComponentValue("Perks", v.name, fy, month, basic, daVal, dummySlip);
    if (val !== null && val !== 0) {
      dummySlip.perks[v.name] = val;
      perksList.push({ name: v.name, value: val });
    }
  });
  if (perksList.length === 0) {
    perksList.push({ name: "Housing Valuation", value: Math.round(totEarn * 0.1 * 100) / 100 });
    perksList.push({ name: "Int Loan Value", value: 28984.00 });
  }
  
  // Form 16 calculations
  const expectedStdDed = parseInt(fy.split('-')[0]) >= 2025 ? 75000 : 50000;
  const projectedGross = totEarn * 12;
  const projectedIncome = projectedGross - expectedStdDed;
  const projectedDed80 = Math.min(150000, (dummySlip.metadata.erc_nps || 0) * 12);
  const projectedTaxPayable = Math.round(projectedIncome * 0.15);
  
  const formatVal = (v) => formatNumber(v);
  const lastMeta = getLastAvailableMetadata();
  const asciiPayslip = generateAsciiPayslipText(basic, daRate, month, fy, dummySlip, totEarn, totDedn, netPay, projectedGross, expectedStdDed, projectedIncome, projectedDed80, projectedTaxPayable, lastMeta);

  const output = document.getElementById('projectionOutput');
  output.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; border-bottom: 1px solid var(--glass-border); padding-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem; margin-top: 1rem;">
      <span style="font-size: 0.95rem; font-weight: bold; color: var(--text-primary);">Projected Salary Slip Output</span>
      <div class="audit-mode-selector" style="margin-bottom: 0;">
        <button class="mode-btn ${projViewMode === 'dashboard' ? 'active' : ''}" id="projBtnDashboard" onclick="changeProjView('dashboard')">Interactive Dashboard</button>
        <button class="mode-btn ${projViewMode === 'replica' ? 'active' : ''}" id="projBtnReplica" onclick="changeProjView('replica')">Original PDF Text Replica</button>
      </div>
    </div>
    
    <div id="projPanelDashboard" style="display: ${projViewMode === 'dashboard' ? 'block' : 'none'};">
      <div class="payslip-mock">
        <div class="payslip-mock-header">
          <div class="payslip-mock-company">OIL AND NATURAL GAS CORPORATION LTD.</div>
          <div class="payslip-mock-company" style="font-size: 0.85rem; font-weight: normal; margin-top: 0.15rem;">CAMBAY</div>
          <div class="payslip-mock-title">PAY SLIP FOR THE MONTH OF ${month} ${fy.split('-')[0]} <span style="margin-left: 2rem;">SR.NO: ${lastMeta.serial_no || '99999'}</span></div>
        </div>
        
        <div class="payslip-mock-box">
          <div class="payslip-mock-box-row">
            <div class="payslip-mock-box-cell"><strong>NAME</strong>: ${lastMeta.name || 'AMRINDER SINGH'}</div>
            <div class="payslip-mock-box-cell"><strong>CPF NO.</strong>: ${lastMeta.cpf_no || '135833'}</div>
            <div class="payslip-mock-box-cell"><strong>BILL</strong>: ${lastMeta.bill || '242'}</div>
          </div>
          <div class="payslip-mock-box-row">
            <div class="payslip-mock-box-cell"><strong>DESGN</strong>: ${lastMeta.designation || 'Executive Engineer ( Instrumentation )'}</div>
            <div class="payslip-mock-box-cell"><strong>UNIT</strong>: ${lastMeta.unit || 'CAMBAY SURFACE'}</div>
          </div>
          <div class="payslip-mock-box-row">
            <div class="payslip-mock-box-cell"><strong>POSITION</strong>: ${lastMeta.position || 'INSTT EXE  EPS ANKL'}</div>
            <div class="payslip-mock-box-cell"><strong>PAN NUMBER</strong>: ${lastMeta.pan || 'HMVPS9491F'}</div>
          </div>
          <div class="payslip-mock-box-row">
            <div class="payslip-mock-box-cell"><strong>PAYSCALE</strong>: ${lastMeta.payscale || '70,000 -   200,000'}</div>
            <div class="payslip-mock-box-cell"><strong>PAY RATE</strong>: ${formatVal(basic)}</div>
            <div class="payslip-mock-box-cell"><strong>EPS-NO</strong>: ${lastMeta.eps_no || ''}</div>
          </div>
        </div>
        
        <div class="payslip-mock-box" style="border-top: none;">
          <div class="payslip-mock-box-row">
            <div class="payslip-mock-box-cell"><strong>ERC-EPS</strong>: 0.00</div>
            <div class="payslip-mock-box-cell"><strong>ERC-NPS</strong>: ${formatVal(dummySlip.metadata.erc_nps || 0)}</div>
            <div class="payslip-mock-box-cell"><strong>DATE OF BIRTH</strong>: ${lastMeta.dob || '01.08.1993'}</div>
          </div>
          <div class="payslip-mock-box-row">
            <div class="payslip-mock-box-cell"><strong>ERC-PRBS</strong>: ${formatVal(dummySlip.metadata.erc_prbs || 0)}</div>
            <div class="payslip-mock-box-cell"><strong>DATE OF JOINING</strong>: ${lastMeta.doj || '26.09.2018'}</div>
          </div>
          <div class="payslip-mock-box-row">
            <div class="payslip-mock-box-cell"><strong>ERC-CPF</strong>: ${formatVal(dummySlip.metadata.erc_cpf || 0)}</div>
            <div class="payslip-mock-box-cell"><strong>ERC-CSSS</strong>: ${formatVal(dummySlip.metadata.erc_csss || 0)}</div>
            <div class="payslip-mock-box-cell"><strong>DATE OF LAST PROMOTION</strong>: ${lastMeta.last_promotion || '01.01.2023'}</div>
          </div>
          <div class="payslip-mock-box-row">
            <div class="payslip-mock-box-cell"><strong>BANK ACCOUNT NO.</strong>: ${lastMeta.bank_acc || 'SBIN020320049147'}</div>
            <div class="payslip-mock-box-cell"><strong>Position ID</strong>: ${lastMeta.position_id || '70141432'}</div>
          </div>
        </div>
        
        <div class="payslip-mock-grid">
          <div class="payslip-mock-grid-col">
            <div class="payslip-mock-grid-header">EARNINGS</div>
            <div class="payslip-mock-grid-content">
              ${earningsList.map(item => `
                <div class="payslip-mock-grid-item">
                  <span>${item.name}</span>
                  <span>${formatVal(item.value)}</span>
                </div>
              `).join('')}
            </div>
            <div class="payslip-mock-grid-item total">
              <span>TOT EARN.</span>
              <span>${formatVal(totEarn)}</span>
            </div>
          </div>
          
          <div class="payslip-mock-grid-col">
            <div class="payslip-mock-grid-header">DEDUCTIONS</div>
            <div class="payslip-mock-grid-content">
              ${deductionsList.map(item => `
                <div class="payslip-mock-grid-item">
                  <span>${item.name}</span>
                  <span>${formatVal(item.value)}</span>
                </div>
              `).join('')}
            </div>
            <div class="payslip-mock-grid-item total">
              <span>TOT DEDN.</span>
              <span>${formatVal(totDedn)}</span>
            </div>
          </div>
          
          <div class="payslip-mock-grid-col" style="background: rgba(16, 185, 129, 0.02);">
            <div class="payslip-mock-grid-header" style="background: rgba(16, 185, 129, 0.05); color: var(--accent-green);">SUMMARY & PAYOUT</div>
            <div class="payslip-mock-grid-content" style="display: flex; flex-direction: column; justify-content: center; padding: 1.5rem 1rem;">
              <div style="text-align: center; margin-bottom: 1rem;">
                <span style="font-size: 0.75rem; color: var(--text-secondary); display: block; text-transform: uppercase;">Gross Earnings</span>
                <span style="font-size: 1.25rem; font-weight: bold; color: var(--accent-cyan);">₹${formatVal(totEarn)}</span>
              </div>
              <div style="text-align: center; margin-bottom: 1.5rem;">
                <span style="font-size: 0.75rem; color: var(--text-secondary); display: block; text-transform: uppercase;">Total Deductions</span>
                <span style="font-size: 1.25rem; font-weight: bold; color: var(--accent-red);">₹${formatVal(totDedn)}</span>
              </div>
              <div style="text-align: center; border-top: 1px dashed var(--glass-border); padding-top: 1.5rem;">
                <span style="font-size: 0.8rem; color: var(--text-primary); display: block; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">NET PAYOUT</span>
                <span style="font-size: 1.8rem; font-weight: 800; color: var(--accent-green); text-shadow: 0 0 10px rgba(16, 185, 129, 0.2);">₹${formatVal(netPay)}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="payslip-mock-loans-title">LOANS & LIABILITIES</div>
        <div class="payslip-mock-loans-grid">
          <div class="payslip-mock-loans-row header">
            <div class="payslip-mock-loans-cell">LOAN TYPE</div>
            <div class="payslip-mock-loans-cell" style="text-align: right;">INSTL</div>
            <div class="payslip-mock-loans-cell" style="text-align: right;">BALANCE</div>
            <div class="payslip-mock-loans-cell" style="text-align: right;">ACC.INTRST</div>
          </div>
          <div class="payslip-mock-loans-row">
            <div class="payslip-mock-loans-cell">Car/4 Wheeler</div>
            <div class="payslip-mock-loans-cell" style="text-align: right;">${formatVal(carLoanInstl)}</div>
            <div class="payslip-mock-loans-cell" style="text-align: right;">${formatVal(carLoanBal)}</div>
            <div class="payslip-mock-loans-cell" style="text-align: right;">${formatVal(carLoanInt)}</div>
          </div>
        </div>
        
        <div class="payslip-mock-grid" style="grid-template-columns: 1fr 1fr; margin-bottom: 0.6rem;">
          <div class="payslip-mock-grid-col" style="border-right: 1px solid var(--glass-border);">
            <div class="payslip-mock-grid-header">ESTIMATED YTD EARNINGS</div>
            <div class="payslip-mock-grid-content">
              <div class="payslip-mock-grid-item"><span>PAY (Basic)</span><span>${formatVal(ytd_pay)}</span></div>
              <div class="payslip-mock-grid-item"><span>DA (Variable)</span><span>${formatVal(ytd_da_val)}</span></div>
              <div class="payslip-mock-grid-item"><span>Other (T)</span><span>${formatVal(ytd_other_t)}</span></div>
            </div>
          </div>
          <div class="payslip-mock-grid-col">
            <div class="payslip-mock-grid-header">ESTIMATED YTD DEDUCTIONS</div>
            <div class="payslip-mock-grid-content">
              <div class="payslip-mock-grid-item"><span>CPF</span><span>${formatVal(ytd_cpf)}</span></div>
              <div class="payslip-mock-grid-item"><span>CSSS</span><span>${formatVal(ytd_csss)}</span></div>
              <div class="payslip-mock-grid-item"><span>Eec PRBS</span><span>${formatVal(ytd_eec_prbs)}</span></div>
              <div class="payslip-mock-grid-item"><span>Tot Incm</span><span>${formatVal(ytd_tot_incm)}</span></div>
              <div class="payslip-mock-grid-item"><span>Tax Incm</span><span>${formatVal(ytd_tax_incm)}</span></div>
            </div>
          </div>
        </div>

        <div class="payslip-mock-grid" style="grid-template-columns: 1fr 1.2fr; margin-bottom: 0;">
          <div class="payslip-mock-grid-col" style="border-right: 1px solid var(--glass-border);">
            <div class="payslip-mock-grid-header">ESTIMATED PERKS</div>
            <div class="payslip-mock-grid-content">
              ${perksList.map(item => `
                <div class="payslip-mock-grid-item">
                  <span>${item.name}</span>
                  <span>${formatVal(item.value)}</span>
                </div>
              `).join('')}
            </div>
          </div>
          <div class="payslip-mock-grid-col">
            <div class="payslip-mock-grid-header">PROJECTED FORM 16 SUMMARY</div>
            <div class="payslip-mock-grid-content">
              <div class="payslip-mock-grid-item"><span>Gross Sal</span><span>${formatVal(projectedGross)}</span></div>
              <div class="payslip-mock-grid-item"><span>Std Dedn</span><span>${formatVal(expectedStdDed)}</span></div>
              <div class="payslip-mock-grid-item"><span>Income (Taxable)</span><span>${formatVal(projectedIncome)}</span></div>
              <div class="payslip-mock-grid-item"><span>Ded us 80 (Sec 80CCD)</span><span>${formatVal(projectedDed80)}</span></div>
              <div class="payslip-mock-grid-item" style="font-weight: bold; border-top: 1px dashed var(--glass-border); padding-top: 0.3rem; margin-top: 0.3rem;">
                <span>Est. Tax Payable</span>
                <span style="color: var(--accent-orange);">₹${formatVal(projectedTaxPayable)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div id="projPanelReplica" style="display: ${projViewMode === 'replica' ? 'block' : 'none'};">
      <pre class="pdf-raw-text" style="font-size: 0.72rem; line-height: 1.35; padding: 1.5rem; max-width: 950px; margin: 0 auto; background: rgba(0,0,0,0.4); border: 1px solid var(--glass-border); color: var(--text-primary); border-radius: 10px; box-shadow: var(--shadow-main);">${asciiPayslip}</pre>
    </div>
  `;
  
  changeProjView(projViewMode);
}

// Formula configuration modal controls
let activeModalFy = "2026-27";

function populateModalFySelector() {
  const modalSelector = document.getElementById('modalFySelector');
  if (!modalSelector) return;
  modalSelector.innerHTML = '';
  
  // Get all unique years from salaryDb
  const years = Object.keys(salaryDb).sort();
  if (years.length === 0) {
    years.push("2026-27");
  }
  
  years.forEach(y => {
    const opt = document.createElement('option');
    opt.value = y;
    opt.innerText = `FY ${y}`;
    modalSelector.appendChild(opt);
  });
  
  const optDefault = document.createElement('option');
  optDefault.value = "default";
  optDefault.innerText = "Default Template";
  modalSelector.appendChild(optDefault);
}

function changeModalFy(fy) {
  activeModalFy = fy;
  renderRulesTable();
}

function openFormulaModal() {
  document.getElementById('ruleBasicInc').value = formulaRules.ruleBasicInc;
  document.getElementById('ruleDA').value = formulaRules.ruleDA;
  document.getElementById('ruleUniform').value = formulaRules.ruleUniform;

  populateModalFySelector();
  const currentFy = document.getElementById('verFySelector').value || "2026-27";
  activeModalFy = currentFy;
  document.getElementById('modalFySelector').value = currentFy;
  
  renderRulesTable();
  document.getElementById('formulaModal').classList.add('active');
}

function closeFormulaModal() {
  document.getElementById('formulaModal').classList.remove('active');
}

/**
 * Clears all saved formula variables from localStorage and resets to embedded defaults.
 * Use this to wipe stale/bad-named data from a previous import, then re-upload Excel.
 */
function resetFormulaVariables() {
  if (!confirm('Reset all formula variables to built-in defaults?\n\nThis will clear any Excel-imported variables from localStorage so you can do a clean re-import.\n\nClick OK to reset.')) return;

  localStorage.removeItem('rulesImported');

  // Rebuild clean defaults for every FY that exists in salaryDb
  const cleanVars = { 'default': JSON.parse(JSON.stringify(defaultFormulaVariables)) };
  Object.keys(salaryDb).forEach(fy => {
    cleanVars[fy] = JSON.parse(JSON.stringify(defaultFormulaVariables));
  });
  formulaRules.variables = cleanVars;
  localStorage.setItem('formulaRulesVariables', JSON.stringify(formulaRules.variables));

  // Re-apply structural seeds (per-FY DA/cafeteria/HCMRS adjustments)
  applyPerFYFormulaSeeds();

  renderRulesTable();
  runAudit();
  alert('✅ Formula variables reset to defaults.\n\nNow re-upload your Excel file to apply your custom rules with correct name mapping.');
}

function saveFormulaRules() {
  formulaRules.ruleBasicInc = parseFloat(document.getElementById('ruleBasicInc').value);
  formulaRules.ruleDA = parseFloat(document.getElementById('ruleDA').value);
  formulaRules.ruleUniform = parseFloat(document.getElementById('ruleUniform').value);

  closeFormulaModal();
  runAudit();
  triggerAutosave();
}

// PDF text parsing engine in client-side JS (Reconstructs line grid)
function setupDragAndDrop() {
  const dropZone = document.getElementById('dropZone');
  
  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, e => {
      e.preventDefault();
      dropZone.style.borderColor = 'var(--accent-cyan)';
      dropZone.style.background = 'rgba(6, 182, 212, 0.05)';
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, e => {
      e.preventDefault();
      dropZone.style.borderColor = 'var(--glass-border)';
      dropZone.style.background = 'rgba(255, 255, 255, 0.01)';
    }, false);
  });

  dropZone.addEventListener('drop', e => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0 && files[0].type === 'application/pdf') {
      processUploadedPDF(files[0]);
    } else {
      alert("Please upload a valid PDF salary slip document.");
    }
  });
}

function handleFileUpload(e) {
  const files = e.target.files;
  if (files.length > 0) {
    processUploadedPDF(files[0]);
  }
}

// Client-side text layout extraction via PDF.js
async function processUploadedPDF(file) {
  try {
    document.getElementById('pdfRawText').innerText = "Loading and extracting layout from PDF...";
    
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let allLines = [];
    
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const items = textContent.items;
      
      if (items.length === 0) continue;
      
      // 1. Group items by vertical position (Y coordinate within 4px tolerance)
      const rows = {};
      items.forEach(item => {
        if (!item.str.trim()) return;
        const y = Math.round(item.transform[5]);
        
        let foundY = null;
        for (const ry of Object.keys(rows)) {
          if (Math.abs(Number(ry) - y) <= 4) {
            foundY = ry;
            break;
          }
        }
        if (foundY !== null) {
          rows[foundY].push(item);
        } else {
          rows[y] = [item];
        }
      });
      
      // Sort rows vertically (descending Y coordinate)
      const sortedY = Object.keys(rows).map(Number).sort((a, b) => b - a);
      
      // Determine page horizontal boundary boundaries
      let pageMinX = Infinity;
      let pageMaxX = -Infinity;
      items.forEach(item => {
        if (!item.str.trim()) return;
        const x = item.transform[4];
        if (x < pageMinX) pageMinX = x;
        if (x > pageMaxX) pageMaxX = x;
      });
      
      // We assume standard page spans 80 character columns
      const charWidth = (pageMaxX - pageMinX) / 78;
      
      // 2. Map items to character slots in each row to reconstruct tabular grid
      sortedY.forEach(y => {
        let rowStr = ' '.repeat(82);
        const rowItems = rows[y].sort((a, b) => a.transform[4] - b.transform[4]);
        
        rowItems.forEach(item => {
          const x = item.transform[4];
          let col = Math.round((x - pageMinX) / charWidth);
          if (col < 0) col = 0;
          if (col >= 82) col = 81;
          
          const text = item.str;
          // Splice text into rowStr
          rowStr = rowStr.substring(0, col) + text + rowStr.substring(col + text.length);
        });
        
        allLines.push(rowStr.trimEnd());
      });
    }

    // Display parsed monospace layout
    const layoutText = allLines.join('\n');
    document.getElementById('pdfRawText').innerText = layoutText;
    
    // Parse properties from layouts
    parseSlipTextLayout(allLines, file.name);
    
  } catch (err) {
    console.error("PDF extraction error: ", err);
    document.getElementById('pdfRawText').innerText = `Failed to parse PDF file. Error: ${err.message}`;
  }
}

// Parse reconstructed layout lines
function parseSlipTextLayout(lines, filename) {
  let metadata = {
    file: filename,
    month: "",
    year: "",
    serial_no: "",
    name: "",
    cpf_no: "",
    designation: "",
    unit: "",
    position: "",
    pan: "",
    payscale: "",
    payrate: 0,
    dob: "",
    doj: "",
    last_promotion: ""
  };
  
  let earnings = {};
  let deductions = {};
  let loans = {};
  let ytd_earnings = {};
  let ytd_deductions = {};
  let perks = {};
  let savings = {};
  let form16 = {};
  let totals = { tot_earn: 0, tot_dedn: 0, net_pay: 0 };
  
  let in_earn_ded_table = false;
  let in_loan_table = false;
  let in_ytd_table = false;
  let in_perks_table = false;

  const cleanJSVal = (str) => {
    if (!str) return 0;
    str = str.replace(/,/g, '').trim();
    if (!str) return 0;
    if (str.endsWith('-')) {
      str = '-' + str.substring(0, str.length - 1);
    }
    const val = parseFloat(str);
    return isNaN(val) ? str : val;
  };

  lines.forEach(line => {
    const line_strip = line.trim();
    if (!line_strip) return;

    if (line_strip.includes("PAY SLIP FOR THE MONTH")) {
      const m = line_strip.match(/PAY SLIP FOR THE MONTH\s+([A-Za-z]+)\s+(\d{4})/);
      if (m) {
        metadata.month = m[1];
        metadata.year = m[2];
      }
      const m_sr = line_strip.match(/SR\.NO\s+(\d+)/);
      if (m_sr) {
        metadata.serial_no = m_sr[1];
      }
      return;
    }

    if (line_strip.includes("NAME") && line_strip.includes("CPF NO")) {
      const m_name = line_strip.match(/NAME\s+([A-Za-z\s]+?)\s+CPF NO/);
      const m_cpf = line_strip.match(/CPF NO\.\s+(\d+)/);
      if (m_name) metadata.name = m_name[1].trim();
      if (m_cpf) metadata.cpf_no = m_cpf[1].trim();
      return;
    }

    if (line_strip.includes("DESGN") && line_strip.includes("UNIT")) {
      const m_des = line_strip.match(/DESGN\s+(.*?)\s+UNIT/);
      const m_unit = line_strip.match(/UNIT\s+(.*?)(?=\s*\||$)/);
      if (m_des) metadata.designation = m_des[1].trim();
      if (m_unit) metadata.unit = m_unit[1].trim();
      return;
    }

    if (line_strip.includes("POSITION") && line_strip.includes("PAN NUMBER")) {
      const m_pos = line_strip.match(/POSITION\s+(.*?)\s+PAN NUMBER/);
      const m_pan = line_strip.match(/PAN NUMBER\s+(.*?)(?=\s*\||$)/);
      if (m_pos) metadata.position = m_pos[1].trim();
      if (m_pan) metadata.pan = m_pan[1].trim();
      return;
    }

    if (line_strip.includes("PAYSCALE") && line_strip.includes("PAY RATE")) {
      const m_scale = line_strip.match(/PAYSCALE\s+(.*?)\s+PAY RATE/);
      const m_rate = line_strip.match(/PAY RATE\s+([\d,]+)/);
      if (m_scale) metadata.payscale = m_scale[1].trim();
      if (m_rate) metadata.payrate = cleanJSVal(m_rate[1]);
      return;
    }

    if (line_strip.includes("DATE OF BIRTH")) {
      const m = line_strip.match(/DATE OF BIRTH\s+([\d.]+)/);
      if (m) metadata.dob = m[1].trim();
    }
    if (line_strip.includes("DATE OF JOINING")) {
      const m = line_strip.match(/DATE OF JOINING(?:\s+[A-Za-z]+)?\s+([\d.]+)/);
      if (m) metadata.doj = m[1].trim();
    }
    if (line_strip.includes("DATE OF LAST PROMOTION")) {
      const m = line_strip.match(/DATE OF LAST PROMOTION\s+([\d.]+)/);
      if (m) metadata.last_promotion = m[1].trim();
    }

    // Parse Employer Contributions (ERC)
    if (line_strip.includes("ERC-EPS")) {
      const m = line_strip.match(/ERC-EPS\s+([\d,.-]+)/);
      if (m) metadata.erc_eps = cleanJSVal(m[1]);
    }
    if (line_strip.includes("ERC-NPS")) {
      const m = line_strip.match(/ERC-NPS\s+([\d,.-]+)/);
      if (m) metadata.erc_nps = cleanJSVal(m[1]);
    }
    if (line_strip.includes("ERC-PRBS")) {
      const m = line_strip.match(/ERC-PRBS\s+([\d,.-]+)/);
      if (m) metadata.erc_prbs = cleanJSVal(m[1]);
    }
    if (line_strip.includes("ERC-CPF")) {
      const m = line_strip.match(/ERC-CPF\s+([\d,.-]+)/);
      if (m) metadata.erc_cpf = cleanJSVal(m[1]);
    }
    if (line_strip.includes("ERC-CSSS")) {
      const m = line_strip.match(/ERC-CSSS\s+([\d,.-]+)/);
      if (m) metadata.erc_csss = cleanJSVal(m[1]);
    }

    // Boundaries
    if (line_strip.includes("YTD EARNINGS") && line_strip.includes("YTD DEDUCTIONS")) {
      in_earn_ded_table = false;
      in_loan_table = false;
      in_ytd_table = true;
      in_perks_table = false;
      return;
    } else if (line_strip.includes("EARNINGS") && line_strip.includes("DEDUCTIONS")) {
      in_earn_ded_table = true;
      in_loan_table = false;
      in_ytd_table = false;
      in_perks_table = false;
      return;
    } else if (line_strip.includes("LOAN TYPE") && line_strip.includes("INSTL")) {
      in_earn_ded_table = false;
      in_loan_table = true;
      in_ytd_table = false;
      in_perks_table = false;
      return;
    } else if (line_strip.includes("PERKS") && line_strip.includes("SAVINGS SEC80C")) {
      in_earn_ded_table = false;
      in_loan_table = false;
      in_ytd_table = false;
      in_perks_table = true;
      return;
    }

    if (line_strip === "|______________________________________________________________________________|") {
      return;
    }

    if (line_strip.startsWith('|') && line_strip.endsWith('|')) {
      const parts = line_strip.split('|');
      
      if (in_earn_ded_table) {
        if (parts.length >= 4) {
          const earn_col = parts[1].trim();
          const ded_col = parts[2].trim();
          const ex_col = parts[3].trim();

          if (earn_col) {
            const m = earn_col.match(/^(.*?)\s+([\d,.-]+)$/);
            if (m) earnings[m[1].trim()] = cleanJSVal(m[2]);
          }
          if (ded_col) {
            const m = ded_col.match(/^(.*?)\s+([\d,.-]+)$/);
            if (m) deductions[m[1].trim()] = cleanJSVal(m[2]);
          }
          if (ex_col) {
            if (ex_col.includes("TOT EARN.")) {
              const m = ex_col.match(/TOT EARN\.\s+([\d,.-]+)/);
              if (m) totals.tot_earn = cleanJSVal(m[1]);
            } else if (ex_col.includes("TOT DEDN.")) {
              const m = ex_col.match(/TOT DEDN\.\s+([\d,.-]+)/);
              if (m) totals.tot_dedn = cleanJSVal(m[1]);
            } else if (ex_col.includes("NET PAY")) {
              const m = ex_col.match(/NET PAY\s+([\d,.-]+)/);
              if (m) totals.net_pay = cleanJSVal(m[1]);
            } else {
              const m = ex_col.match(/^(.*?)\s+([\d,.-]+)$/);
              if (m) form16[m[1].trim()] = cleanJSVal(m[2]);
            }
          }
        }
      } else if (in_loan_table) {
        const content = parts[1].trim();
        if (content) {
          const m = content.match(/^(.*?)\s+([\d,.-]+)\s+([\d,.-]+)\s+([\d,.-]+)$/);
          if (m) {
            loans[m[1].trim()] = {
              installment: cleanJSVal(m[2]),
              balance: cleanJSVal(m[3]),
              accrued_interest: cleanJSVal(m[4])
            };
          }
        }
      } else if (in_ytd_table) {
        for (let col_idx = 1; col_idx < parts.length - 1; col_idx++) {
          const part_str = parts[col_idx].trim();
          if (part_str) {
            const m = part_str.match(/^(.*?)\s+([\d,.-]+)$/);
            if (m) {
              const name = m[1].trim();
              const val = cleanJSVal(m[2]);
              if (col_idx === 1 || col_idx === 2) {
                ytd_earnings[name] = val;
              } else {
                ytd_deductions[name] = val;
              }
            }
          }
        }
      } else if (in_perks_table) {
        if (parts.length >= 5) {
          const pk = parts[1].trim();
          const sv = parts[2].trim();
          const f1 = parts[3].trim();
          const f2 = parts[4].trim();

          if (pk) {
            const m = pk.match(/^(.*?)\s+([\d,.-]+)$/);
            if (m) perks[m[1].trim()] = cleanJSVal(m[2]);
          }
          if (sv) {
            const m = sv.match(/^(.*?)\s+([\d,.-]+)$/);
            if (m) savings[m[1].trim()] = cleanJSVal(m[2]);
          }
          if (f1) {
            const m = f1.match(/^(.*?)\s+([\d,.-]+)$/);
            if (m) form16[m[1].trim()] = cleanJSVal(m[2]);
          }
          if (f2) {
            const m = f2.match(/^(.*?)\s+([\d,.-]+)$/);
            if (m) form16[m[1].trim()] = cleanJSVal(m[2]);
          }
        }
      }
    }
  });

  if (Object.keys(earnings).length === 0 && Object.keys(deductions).length === 0) {
    // Generic fallback parser for other layouts
    lines.forEach(line => {
      const line_strip = line.trim();
      if (!line_strip) return;
      
      // Try to parse basic metadata
      if (!metadata.month || !metadata.year) {
        const monthMatch = line_strip.match(/(April|May|June|July|August|September|October|November|December|January|February|March)\s*[-/,\s]?\s*(\d{4})/i);
        if (monthMatch) {
          metadata.month = monthMatch[1].charAt(0).toUpperCase() + monthMatch[1].slice(1).toLowerCase();
          metadata.year = monthMatch[2];
        }
      }
      
      if (!metadata.name) {
        const nameMatch = line_strip.match(/(?:Employee\s+)?Name\s*[:|-]?\s*([A-Za-z\s.]{3,30})/i);
        if (nameMatch) metadata.name = nameMatch[1].trim();
      }
      
      if (!metadata.cpf_no) {
        const empIdMatch = line_strip.match(/(?:Emp(?:loyee)?\s+(?:No|Id|Code)|CPF\s*(?:No)?|ID\s*(?:No)?)\s*[:|-]?\s*(\d+)/i);
        if (empIdMatch) metadata.cpf_no = empIdMatch[1].trim();
      }
      
      if (!metadata.payrate) {
        const rateMatch = line_strip.match(/(?:Pay\s*Rate|Basic\s*Pay|Rate\s*of\s*Pay)\s*[:|-]?\s*([\d,.]+)/i);
        if (rateMatch) metadata.payrate = cleanJSVal(rateMatch[1]);
      }
      
      if (!metadata.designation) {
        const desgnMatch = line_strip.match(/(?:Designation|Desgn|Role)\s*[:|-]?\s*([A-Za-z0-9\s/().-]{3,30})/i);
        if (desgnMatch) metadata.designation = desgnMatch[1].trim();
      }
      
      // Generic component parser
      // Segment lines by multiple spaces or tabs
      const segments = line_strip.split(/\s{2,}|\t/).map(s => s.trim()).filter(s => s);
      
      segments.forEach(segment => {
        // Look for description followed by a space and a numeric value
        const kvMatch = segment.match(/^([A-Za-z0-9\s/&()._-]{3,30})\s+([\d,.-]+)$/);
        if (kvMatch) {
          const key = kvMatch[1].trim();
          const val = cleanJSVal(kvMatch[2]);
          
          if (typeof val === 'number' && !isNaN(val) && val !== 0) {
            const keyLower = key.toLowerCase();
            
            // Skip metadata and generic noise
            if (["pan", "pf no", "bank", "account", "uan", "doj", "dob", "designation", "month", "year", "serial", "cpf"].some(keyword => keyLower.includes(keyword))) {
              return;
            }
            
            // Extract totals
            if (keyLower.includes("total earn") || keyLower.includes("gross salary") || keyLower.includes("gross earn")) {
              totals.tot_earn = val;
              return;
            }
            if (keyLower.includes("total ded") || keyLower.includes("total recovery")) {
              totals.tot_dedn = val;
              return;
            }
            if (keyLower.includes("net pay") || keyLower.includes("net salary") || keyLower.includes("take home")) {
              totals.net_pay = val;
              return;
            }
            
            // Categorize based on standard keyword semantics
            const earnKeywords = ["pay", "allowance", "da", "dearness", "hra", "rent", "conveyance", "medical", "uniform", "bonus", "incentive", "basic", "earnings", "gross", "reimb", "maint", "cmre", "lfa", "perk", "wash", "special"];
            const dedKeywords = ["tax", "pf", "provident", "deductions", "loan", "recovery", "fund", "welfare", "lic", "gpf", "nps", "insurance", "association", "subscription", "club", "rent", "society", "coop", "sahyog", "hcmrs", "cpf", "eps", "prbs", "csss"];
            
            const isEarn = earnKeywords.some(keyword => keyLower.includes(keyword));
            const isDed = dedKeywords.some(keyword => keyLower.includes(keyword));
            
            if (isDed && !isEarn) {
              deductions[key] = val;
            } else if (isEarn && !isDed) {
              earnings[key] = val;
            } else {
              // Guess based on position in original line
              const lineIndex = line.indexOf(segment);
              if (lineIndex < line.length / 2) {
                earnings[key] = val;
              } else {
                deductions[key] = val;
              }
            }
          }
        }
      });
    });
    
    // Auto-calculate totals if not parsed
    if (totals.tot_earn === 0) {
      totals.tot_earn = Object.values(earnings).reduce((a, b) => a + b, 0);
    }
    if (totals.tot_dedn === 0) {
      totals.tot_dedn = Object.values(deductions).reduce((a, b) => a + b, 0);
    }
    if (totals.net_pay === 0) {
      totals.net_pay = totals.tot_earn - totals.tot_dedn;
    }
    
    // Default metadata if not found
    if (!metadata.name) metadata.name = "Employee Name";
    if (!metadata.cpf_no) metadata.cpf_no = "100001";
    if (!metadata.payrate) metadata.payrate = earnings["Basic Pay"] || 0;
  }

  // Store active parsed slip for review & save
  activeParsedSlip = {
    metadata: metadata,
    earnings: earnings,
    deductions: deductions,
    loans: loans,
    ytd_earnings: ytd_earnings,
    ytd_deductions: ytd_deductions,
    perks: perks,
    savings: savings,
    form16: form16,
    totals: totals
  };

  // Render variables preview in Mapper UI
  const previewEl = document.getElementById('parsedVarsList');
  previewEl.innerHTML = '';

  // Slip Summary Header
  const header = document.createElement('div');
  header.style.marginBottom = '1rem';
  header.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
  header.style.paddingBottom = '0.75rem';
  header.innerHTML = `
    <h3 style="color: var(--accent-cyan); font-size: 1.05rem;">
      Slip month: ${metadata.month || 'Unknown'} ${metadata.year || ''}
    </h3>
    <p style="font-size: 0.75rem; color: var(--text-secondary);">
      Name: ${metadata.name} • CPF: ${metadata.cpf_no} • Pay Rate: ${formatINR(metadata.payrate)}
    </p>
    <p style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.2rem;">
      Designation: ${metadata.designation} • Unit: ${metadata.unit}
    </p>
  `;
  previewEl.appendChild(header);

  // Group items by category in the preview
  const categories = [
    { label: "Earnings", data: earnings },
    { label: "Deductions", data: deductions },
    { label: "Totals", data: { "Total Earnings (Gross)": totals.tot_earn, "Total Deductions": totals.tot_dedn, "Net Pay Out": totals.net_pay } }
  ];

  categories.forEach(cat => {
    if (Object.keys(cat.data).length === 0) return;
    const catHeader = document.createElement('h4');
    catHeader.style.fontSize = '0.8rem';
    catHeader.style.color = 'var(--text-muted)';
    catHeader.style.marginTop = '0.75rem';
    catHeader.style.marginBottom = '0.25rem';
    catHeader.innerText = cat.label.toUpperCase();
    previewEl.appendChild(catHeader);

    for (const key in cat.data) {
      const val = cat.data[key];
      const div = document.createElement('div');
      div.className = 'preview-var-item';
      div.innerHTML = `
        <span class="preview-var-name">${key}</span>
        <span class="preview-var-val" style="color: ${cat.label === 'Deductions' ? 'var(--accent-red)' : (cat.label === 'Totals' && key.startsWith('Net') ? 'var(--accent-green)' : 'var(--text-primary)')}">
          ${formatINR(val)}
        </span>
      `;
      previewEl.appendChild(div);
    }
  });

  // Enable save button
  const saveBtn = document.getElementById('saveSlipBtn');
  saveBtn.disabled = false;
}

// Save parsed slip to database and localstorage
function saveParsedSlip() {
  if (!activeParsedSlip || !activeParsedSlip.metadata.month || !activeParsedSlip.metadata.year) {
    alert("No valid payslip parsed yet.");
    return;
  }
  
  const year = activeParsedSlip.metadata.year;
  const month = activeParsedSlip.metadata.month;
  
  // Resolve financial year string
  // If month is Jan, Feb, Mar, the year belongs to (year-1)-year, else year-(year+1)
  const yrNum = parseInt(year);
  let fy = "";
  if (["January", "February", "March"].includes(month)) {
    fy = `${yrNum - 1}-${year.substring(2)}`;
  } else {
    fy = `${year}-${(yrNum + 1).toString().substring(2)}`;
  }

  if (!salaryDb[fy]) {
    salaryDb[fy] = {};
  }

  // Check if we need to merge (e.g. spillover page) or overwrite
  if (salaryDb[fy][month]) {
    const choice = confirm(`A payslip already exists for ${month} of FY ${fy}. Do you want to merge/append the data of the new pages (recommended for multi-page continuation slips)?`);
    if (choice) {
      salaryDb[fy][month] = {
        metadata: mergeJS_Dicts(salaryDb[fy][month].metadata, activeParsedSlip.metadata),
        earnings: mergeJS_Dicts(salaryDb[fy][month].earnings, activeParsedSlip.earnings),
        deductions: mergeJS_Dicts(salaryDb[fy][month].deductions, activeParsedSlip.deductions),
        loans: mergeJS_Dicts(salaryDb[fy][month].loans, activeParsedSlip.loans),
        ytd_earnings: mergeJS_Dicts(salaryDb[fy][month].ytd_earnings, activeParsedSlip.ytd_earnings),
        ytd_deductions: mergeJS_Dicts(salaryDb[fy][month].ytd_deductions, activeParsedSlip.ytd_deductions),
        perks: mergeJS_Dicts(salaryDb[fy][month].perks, activeParsedSlip.perks),
        savings: mergeJS_Dicts(salaryDb[fy][month].savings, activeParsedSlip.savings),
        form16: mergeJS_Dicts(salaryDb[fy][month].form16, activeParsedSlip.form16),
        totals: activeParsedSlip.totals.net_pay > 0 ? activeParsedSlip.totals : salaryDb[fy][month].totals
      };
    } else {
      salaryDb[fy][month] = activeParsedSlip;
    }
  } else {
    salaryDb[fy][month] = activeParsedSlip;
  }

  // Save changes locally, to server and to cloud
  triggerAutosave();
  
  alert(`Successfully saved payslip for ${month} of FY ${fy} to the ledger database!`);
  
  // Re-run setup
  populateYearSelectors();
  syncYearSelectors(fy);
  
  // Go to spreadsheet view
  switchView('spreadsheet');
}

function mergeJS_Dicts(d1, d2) {
  let res = Object.assign({}, d1);
  for (const k in d2) {
    const v = d2[k];
    if (res.hasOwnProperty(k)) {
      if (typeof res[k] === 'object' && typeof v === 'object' && res[k] !== null && v !== null) {
        res[k] = mergeJS_Dicts(res[k], v);
      } else {
        if (v !== 0 && v !== "") {
          res[k] = v;
        }
      }
    } else {
      res[k] = v;
    }
  }
  return res;
}

// ====================================================
// DATA HUB OPERATIONS (LOCAL, BACKUP, GOOGLE DRIVE)
// ====================================================

// Check Python Local Server status
async function checkLocalServerStatus() {
  const badge = document.getElementById('localServerBadge');
  const btn = document.getElementById('localServerSyncBtn');
  const connState = document.getElementById('dataHubConnState');
  
  if (btn) btn.disabled = false;
  
  try {
    const res = await fetch('/api/get_formulas');
    isLocalServer = true;
    if (badge) {
      badge.innerText = "Active (Connected)";
      badge.style.background = "rgba(16, 185, 129, 0.15)";
      badge.style.color = "var(--accent-green)";
    }
    if (connState) {
      connState.innerText = "Local Server Connected (Autosave Active)";
      connState.style.color = "var(--accent-green)";
    }
    const storageMode = document.getElementById('dataHubStorageMode');
    if (storageMode) {
      storageMode.innerText = "Local Server + Disk Files";
    }
  } catch (e) {
    isLocalServer = false;
    if (badge) {
      badge.innerText = "Inactive";
      badge.style.background = "rgba(255,255,255,0.05)";
      badge.style.color = "var(--text-muted)";
    }
    if (connState) {
      connState.innerText = googleAccessToken ? "Cloud Connected" : "Offline / Sandbox";
      connState.style.color = googleAccessToken ? "var(--accent-cyan)" : "var(--text-secondary)";
    }
    const storageMode = document.getElementById('dataHubStorageMode');
    if (storageMode) {
      storageMode.innerText = googleAccessToken ? "Google Drive Cloud" : "Browser Local Cache";
    }
  }
}

// Update Active Storage Overview counts
function updateDataHubOverview() {
  let fyCount = Object.keys(salaryDb).length;
  let slipCount = 0;
  
  for (const fy in salaryDb) {
    slipCount += Object.keys(salaryDb[fy]).length;
  }
  
  const fyEl = document.getElementById('dataHubTotalFys');
  const slipsEl = document.getElementById('dataHubTotalSlips');
  
  if (fyEl) fyEl.innerText = fyCount;
  if (slipsEl) slipsEl.innerText = slipCount;
}

// Export database and formulas to JSON
function exportLedgerJSON() {
  const payload = {
    salaryDb: salaryDb,
    formulaRules: formulaRules,
    formulaRulesVariables: formulaRules.variables
  };
  
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
  const dlAnchorElem = document.createElement('a');
  dlAnchorElem.setAttribute("href", dataStr);
  dlAnchorElem.setAttribute("download", "salary_ledger.json");
  dlAnchorElem.click();
}

// Import database and formulas from JSON file
function importLedgerJSON(event) {
  const files = event.target.files;
  if (files.length === 0) return;
  
  const file = files[0];
  const reader = new FileReader();
  
  reader.onload = function(e) {
    try {
      const payload = JSON.parse(e.target.result);
      if (!payload || !payload.salaryDb) {
        alert("Error: The backup file does not contain a valid salaryDb structure.");
        return;
      }
      
      if (confirm("Are you sure you want to import this ledger? This will overwrite all currently loaded salary slips and formula rules!")) {
        salaryDb = payload.salaryDb;
        if (payload.formulaRules) {
          formulaRules = payload.formulaRules;
        }
        if (payload.formulaRulesVariables) {
          formulaRules.variables = payload.formulaRulesVariables;
        }
        
        localStorage.setItem('rulesImported', 'true');
        
        // Trigger save and reinitialize view
        triggerAutosave();
        
        populateYearSelectors();
        const years = Object.keys(salaryDb).sort();
        if (years.length > 0) {
          selectedYear = years[years.length - 1];
          syncYearSelectors(selectedYear);
        }
        
        updateDashboard();
        renderSpreadsheet();
        runAudit();
        
        alert("✅ Backup successfully imported! Dashboard and formulas have been updated.");
        updateDataHubOverview();
      }
    } catch (err) {
      alert("Failed to parse backup JSON file: " + err.message);
    }
  };
  
  reader.readAsText(file);
}

// Google Drive AppData functions
function initGoogleClient() {
  if (!CLIENT_ID) {
    updateGDriveStatus("Missing Client ID", "var(--accent-red)");
    return;
  }
  
  // Check URL hash for OAuth redirect token (Implicit flow fallback for mobile/Capacitor)
  const hash = window.location.hash;
  if (hash) {
    const params = new URLSearchParams(hash.substring(1));
    const redirectToken = params.get('access_token');
    if (redirectToken) {
      googleAccessToken = redirectToken;
      localStorage.setItem('gdriveAccessToken', googleAccessToken);
      // Clean hash from URL without reloading
      if (window.history && window.history.replaceState) {
        window.history.replaceState("", document.title, window.location.pathname + window.location.search);
      } else {
        window.location.hash = '';
      }
    }
  }
  
  try {
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/drive.appdata',
      callback: (tokenResponse) => {
        if (tokenResponse.error !== undefined) {
          console.error("GIS Error:", tokenResponse);
          updateGDriveStatus("Auth Failed", "var(--accent-red)");
          return;
        }
        googleAccessToken = tokenResponse.access_token;
        localStorage.setItem('gdriveAccessToken', googleAccessToken);
        updateGDriveStatus("Authenticated", "var(--accent-green)");
        
        // Load the Drive API client
        gapi.load('client', async () => {
          await gapi.client.init({});
          await gapi.client.load('drive', 'v3');
          gapi.client.setToken({ access_token: googleAccessToken });
          await syncWithGDrive();
        });
      },
    });
    gisInited = true;
    
    // Check for cached token
    const cachedToken = localStorage.getItem('gdriveAccessToken');
    if (cachedToken) {
      googleAccessToken = cachedToken;
      updateGDriveStatus("Authenticated (Cached)", "var(--accent-green)");
      gapi.load('client', async () => {
        await gapi.client.init({});
        await gapi.client.load('drive', 'v3');
        gapi.client.setToken({ access_token: googleAccessToken });
        await syncWithGDrive();
      });
    }
  } catch (e) {
    console.error("Failed to init Google client:", e);
    updateGDriveStatus("Initialization Error", "var(--accent-red)");
  }
}

function updateGDriveStatus(text, color) {
  const statusEl = document.getElementById('gdriveStatus');
  if (statusEl) {
    statusEl.innerText = text;
    statusEl.style.color = color || 'var(--text-primary)';
  }
  
  const loginBtn = document.getElementById('gdriveLoginBtn');
  const logoutBtn = document.getElementById('gdriveLogoutBtn');
  const pullBtn = document.getElementById('gdrivePullBtn');
  const pushBtn = document.getElementById('gdrivePushBtn');
  
  if (googleAccessToken) {
    if (loginBtn) loginBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'inline-block';
    if (pullBtn) pullBtn.disabled = false;
    if (pushBtn) pushBtn.disabled = false;
  } else {
    if (loginBtn) loginBtn.style.display = 'inline-block';
    if (logoutBtn) logoutBtn.style.display = 'none';
    if (pullBtn) pullBtn.disabled = true;
    if (pushBtn) pushBtn.disabled = true;
  }
}

function saveGoogleClientId() {
  const inputEl = document.getElementById('gdriveClientId');
  if (!inputEl) return;
  
  const val = inputEl.value.trim();
  if (!val) {
    alert("Please enter a valid Google Client ID.");
    return;
  }
  
  CLIENT_ID = val;
  localStorage.setItem('gdriveClientId', CLIENT_ID);
  alert("Client ID saved! Initializing Google client...");
  initGoogleClient();
}

// Click callback to sign in
function connectGoogleDrive() {
  // Check if we are running inside the Capacitor iOS wrapper (where popups are blocked by Google)
  const isCapacitor = !!window.Capacitor || 
                      navigator.userAgent.includes('Capacitor') || 
                      (navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad') || navigator.userAgent.includes('iPod'));
                      
  if (isCapacitor) {
    if (!CLIENT_ID) {
      alert("Please enter your Google OAuth Client ID first and click Save.");
      return;
    }
    // Dynamically calculate redirect URI based on active environment (GitHub Pages vs Localhost/Capacitor)
    let redirectUri = window.location.origin + window.location.pathname;
    if (redirectUri.endsWith('/index.html')) {
      redirectUri = redirectUri.substring(0, redirectUri.length - 10);
    }
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(CLIENT_ID)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=https://www.googleapis.com/auth/drive.appdata&prompt=consent`;
    window.location.href = authUrl;
    return;
  }

  if (!tokenClient) {
    alert("Please enter your Google OAuth Client ID first and click Save.");
    return;
  }
  tokenClient.requestAccessToken({ prompt: 'consent' });
}

function disconnectGoogleDrive() {
  googleAccessToken = null;
  gdriveFileId = null;
  localStorage.removeItem('gdriveAccessToken');
  updateGDriveStatus("Not Connected", "var(--text-muted)");
  alert("Signed out from Google Drive.");
}

async function syncWithGDrive() {
  try {
    updateGDriveStatus("Searching AppData...", "var(--accent-cyan)");
    const response = await gapi.client.drive.files.list({
      spaces: 'appDataFolder',
      q: "name = 'salary_ledger.json'",
      fields: 'files(id, name)',
      pageSize: 1
    });
    
    const files = response.result.files;
    if (files && files.length > 0) {
      gdriveFileId = files[0].id;
      updateGDriveStatus("Connected (Cloud File Found)", "var(--accent-green)");
      console.log("Cloud file found with ID:", gdriveFileId);
    } else {
      updateGDriveStatus("Connected (No Cloud File)", "var(--accent-green)");
      console.log("No cloud file found. Click Push to create one.");
    }
  } catch (e) {
    console.error("GDrive Sync Error:", e);
    if (e.status === 401) {
      googleAccessToken = null;
      localStorage.removeItem('gdriveAccessToken');
      updateGDriveStatus("Session Expired. Log In Again.", "var(--accent-red)");
    } else {
      updateGDriveStatus("Sync Check Failed", "var(--accent-red)");
    }
  }
}

async function pullGDriveLedger() {
  if (!googleAccessToken || !gdriveFileId) {
    alert("No cloud backup file found to pull from.");
    return;
  }
  
  if (!confirm("Are you sure you want to load the cloud data? This will overwrite all your browser cache data!")) {
    return;
  }
  
  try {
    updateGDriveStatus("Pulling cloud data...", "var(--accent-cyan)");
    const response = await gapi.client.drive.files.get({
      fileId: gdriveFileId,
      alt: 'media'
    });
    
    const payload = response.result;
    if (payload && payload.salaryDb) {
      salaryDb = payload.salaryDb;
      localStorage.setItem('salaryDb', JSON.stringify(salaryDb));
      
      if (payload.formulaRules) {
        formulaRules = payload.formulaRules;
        localStorage.setItem('formulaRules', JSON.stringify(formulaRules));
      }
      if (payload.formulaRulesVariables) {
        formulaRules.variables = payload.formulaRulesVariables;
        localStorage.setItem('formulaRulesVariables', JSON.stringify(formulaRules.variables));
      }
      
      localStorage.setItem('rulesImported', 'true');
      
      populateYearSelectors();
      const years = Object.keys(salaryDb).sort();
      if (years.length > 0) {
        selectedYear = years[years.length - 1];
        syncYearSelectors(selectedYear);
      }
      
      updateDashboard();
      renderSpreadsheet();
      runAudit();
      
      alert("✅ Data successfully pulled from Google Drive and restored!");
      updateGDriveStatus("Sync Synced", "var(--accent-green)");
      updateDataHubOverview();
    } else {
      alert("Failed: Cloud backup structure is invalid.");
      updateGDriveStatus("Pull Failed", "var(--accent-red)");
    }
  } catch (e) {
    console.error("Cloud Pull Error:", e);
    alert("Pull failed: " + (e.message || JSON.stringify(e)));
    updateGDriveStatus("Pull Failed", "var(--accent-red)");
  }
}

async function pushGDriveLedger() {
  if (!googleAccessToken) {
    alert("Please connect/log in to Google Drive first.");
    return;
  }
  
  try {
    updateGDriveStatus("Pushing to cloud...", "var(--accent-cyan)");
    const fileMetadata = {
      name: 'salary_ledger.json',
      parents: ['appDataFolder']
    };
    
    const fileContent = JSON.stringify({
      salaryDb: salaryDb,
      formulaRules: formulaRules,
      formulaRulesVariables: formulaRules.variables
    }, null, 2);
    
    if (gdriveFileId) {
      // Patch existing
      await gapi.client.request({
        'path': '/upload/drive/v3/files/' + gdriveFileId,
        'method': 'PATCH',
        'params': {'uploadType': 'media'},
        'headers': {
          'Content-Type': 'application/json'
        },
        'body': fileContent
      });
      console.log("Updated cloud backup successfully.");
    } else {
      // Create new multipart
      const boundary = '314159265358979323846';
      const delimiter = "\r\n--" + boundary + "\r\n";
      const close_delim = "\r\n--" + boundary + "--";
      
      const body = delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(fileMetadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        fileContent +
        close_delim;
        
      const response = await gapi.client.request({
        'path': '/upload/drive/v3/files',
        'method': 'POST',
        'params': {'uploadType': 'multipart'},
        'headers': {
          'Content-Type': 'multipart/related; boundary="' + boundary + '"'
        },
        'body': body
      });
      gdriveFileId = response.result.id;
      console.log("Created cloud backup with ID:", gdriveFileId);
    }
    
    updateGDriveStatus("Cloud Updated", "var(--accent-green)");
    alert("✅ Data successfully saved to your Google Drive AppData folder!");
  } catch (e) {
    console.error("Cloud Push Error:", e);
    alert("Push failed: " + (e.message || JSON.stringify(e)));
    updateGDriveStatus("Push Failed", "var(--accent-red)");
  }
}

// Unified triggerAutosave function
async function triggerAutosave() {
  // 1. Write to browser LocalStorage cache
  localStorage.setItem('salaryDb', JSON.stringify(salaryDb));
  localStorage.setItem('formulaRules', JSON.stringify(formulaRules));
  localStorage.setItem('formulaRulesVariables', JSON.stringify(formulaRules.variables));
  
  // 2. Local server autosave if running via python server
  if (isLocalServer) {
    try {
      // Save database
      await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(salaryDb)
      });
      
      // Save formulas
      await fetch('/api/save_formulas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formulaRules)
      });
      console.log("Autosaved to disk files successfully.");
    } catch (e) {
      console.warn("Local server autosave failed:", e);
    }
  }
  
  // 3. Background cloud sync to Google Drive AppData
  if (googleAccessToken) {
    try {
      console.log("Background cloud syncing to Google Drive...");
      const fileContent = JSON.stringify({
        salaryDb: salaryDb,
        formulaRules: formulaRules,
        formulaRulesVariables: formulaRules.variables
      });
      
      if (gdriveFileId) {
        await gapi.client.request({
          'path': '/upload/drive/v3/files/' + gdriveFileId,
          'method': 'PATCH',
          'params': {'uploadType': 'media'},
          'headers': { 'Content-Type': 'application/json' },
          'body': fileContent
        });
        console.log("Background cloud sync successful.");
        updateGDriveStatus("Cloud Updated", "var(--accent-green)");
      } else {
        // Create the file in background
        const fileMetadata = {
          name: 'salary_ledger.json',
          parents: ['appDataFolder']
        };
        const boundary = '314159265358979323846';
        const delimiter = "\r\n--" + boundary + "\r\n";
        const close_delim = "\r\n--" + boundary + "--";
        const body = delimiter +
          'Content-Type: application/json\r\n\r\n' +
          JSON.stringify(fileMetadata) +
          delimiter +
          'Content-Type: application/json\r\n\r\n' +
          fileContent +
          close_delim;
          
        const response = await gapi.client.request({
          'path': '/upload/drive/v3/files',
          'method': 'POST',
          'params': {'uploadType': 'multipart'},
          'headers': {
            'Content-Type': 'multipart/related; boundary="' + boundary + '"'
          },
          'body': body
        });
        gdriveFileId = response.result.id;
        updateGDriveStatus("Cloud Updated", "var(--accent-green)");
      }
    } catch (e) {
      console.warn("Background cloud sync failed:", e);
      updateGDriveStatus("Sync Failed", "var(--accent-red)");
    }
  }
  
  // Update overview stats
  updateDataHubOverview();
}

// Add local server test button handler
document.addEventListener('DOMContentLoaded', () => {
  const testBtn = document.getElementById('localServerSyncBtn');
  if (testBtn) {
    testBtn.addEventListener('click', async () => {
      await checkLocalServerStatus();
      if (isLocalServer) {
        alert("✅ Connection successful! The local Python server is active. Your data will be saved directly to disk files automatically.");
      } else {
        alert("❌ Connection failed. Ensure server.py is running on port 8080 (or 8000) and that you are loading this page at http://localhost:8080");
      }
    });
  }
});
