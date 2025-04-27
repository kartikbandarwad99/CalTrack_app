export type Message = {
    text?: string
    image?: string
    sender: "user" | "bot"
  }
  
  // Ensure this type matches the one used in your components
  export type NutritionalData = {
    macronutrients: {
      foodItem: string;
      quantity: string;
      calories: number;
      protein_g: number;
      carbs_g: number;
      fats_g: number;
    }[];
    micronutrients?: Record<string, Array<{
      micronutrient: string;
      amount: string;
    }>>;
    timestamp: string;
    foodItems: string; // Summary string like "1 apple, 100g chicken"
  };
  
  // Calculates total macros for a single NutritionalData entry
  export const calculateTotals = (data: NutritionalData | undefined) => {
    if (!data || !data.macronutrients) return { calories: 0, protein: 0, carbs: 0, fats: 0 };
  
    return {
      calories: data.macronutrients.reduce((a, b) => a + b.calories, 0),
      protein: data.macronutrients.reduce((a, b) => a + b.protein_g, 0),
      carbs: data.macronutrients.reduce((a, b) => a + b.carbs_g, 0),
      fats: data.macronutrients.reduce((a, b) => a + b.fats_g, 0)
    };
  };
  
  // Formats micronutrient data into a table structure for display (for single breakdown)
  export const getMicronutrientTableData = (data: NutritionalData | undefined) => {
    if (!data || !data.micronutrients) return [];
  
    const microTable: any[] = []; // Use 'any' or refine type if needed
  
    Object.entries(data.micronutrients).forEach(([foodItem, micronutrients]) => {
      const foodRow: any = { foodItem }; // Use 'any' or refine type if needed
  
      micronutrients.forEach((micro: any) => { // Use 'any' or refine type if needed
        const { micronutrient, amount } = micro;
        foodRow[micronutrient] = amount;
      });
  
      microTable.push(foodRow);
    });
  
    return microTable;
  };
  
  // Gets unique micronutrient names from a single NutritionalData entry
  export const getMicronutrientNames = (data: NutritionalData | undefined): string[] => {
    if (!data || !data.micronutrients) return [];
  
    const micronutrientSet = new Set<string>();
  
    Object.values(data.micronutrients).forEach(micronutrients => {
      micronutrients.forEach((micro: any) => { // Use 'any' or refine type if needed
        micronutrientSet.add(micro.micronutrient);
      });
    });
  
    return Array.from(micronutrientSet);
  };
  
  // Calculates total micronutrients for a single NutritionalData entry
  export const calculateMicronutrientTotals = (data: NutritionalData | undefined): Record<string, string> => {
    if (!data || !data.micronutrients) return {};
  
    const totals: Record<string, { value: number; unit: string }> = {};
  
    Object.values(data.micronutrients).forEach(micronutrients => {
      micronutrients.forEach((micro: any) => { // Use 'any' or refine type if needed
        const { micronutrient, amount } = micro;
  
        const match = amount.match(/^([\d.]+)\s*(.*)$/);
        if (match) {
          const value = parseFloat(match[1]);
          const unit = match[2];
  
          if (!totals[micronutrient]) {
            totals[micronutrient] = { value: 0, unit: unit };
          }
  
          // Only add if units match
          if (totals[micronutrient].unit === unit) {
            totals[micronutrient].value += value;
          } else {
               // Handle mixed units case - for simplicity here, we'll skip or log a warning
               // console.warn(`Mixed units found for ${micronutrient}: ${totals[micronutrient].unit} and ${unit}`);
               // A more robust solution would involve unit conversion
          }
        }
      });
    });
  
    const formattedTotals: Record<string, string> = {};
    Object.entries(totals).forEach(([nutrient, { value, unit }]) => {
      formattedTotals[nutrient] = `${parseFloat(value.toFixed(1))} ${unit}`; // Avoid trailing .0
    });
  
    return formattedTotals;
  };
  
  
  // --- Dashboard Specific Calculations (Use on Dashboard Page) ---
  
  // Calculates total macros for an array of NutritionalData entries (for the Dashboard)
  export const calculateTotalDashboardMacros = (dataArray: NutritionalData[]): { calories: number; protein: number; carbs: number; fats: number } => {
      if (!dataArray || dataArray.length === 0) {
          return { calories: 0, protein: 0, carbs: 0, fats: 0 };
      }
      return dataArray.reduce(
          (acc, curr) => {
              const totals = calculateTotals(curr); // Use the single-item total function
              return {
                  calories: acc.calories + totals.calories,
                  protein: acc.protein + totals.protein,
                  carbs: acc.carbs + totals.carbs,
                  fats: acc.fats + totals.fats,
              };
          },
          { calories: 0, protein: 0, carbs: 0, fats: 0 }
      );
  };
  
  // Calculates total micronutrients for an array of NutritionalData entries (for the Dashboard)
  export const calculateTotalDashboardMicros = (dataArray: NutritionalData[]): Record<string, string> => {
      if (!dataArray || dataArray.length === 0) {
          return {};
      }
  
      const allMicros: Record<string, { value: number; unit: string }[]> = {};
  
      dataArray.forEach(data => {
          if (data.micronutrients) {
              Object.values(data.micronutrients).forEach(micronutrients => {
                  micronutrients.forEach(micro => { // Use 'any' or refine type if needed
                      const { micronutrient, amount } = micro;
                      const match = amount.match(/^([\d.]+)\s*(.*)$/);
                      if (match) {
                          const value = parseFloat(match[1]);
                          const unit = match[2];
                          if (!allMicros[micronutrient]) {
                              allMicros[micronutrient] = [];
                          }
                          allMicros[micronutrient].push({ value, unit });
                      }
                  });
              });
          }
      });
  
      const totals: Record<string, { value: number; unit: string }> = {};
      for (const nutrient in allMicros) {
          const values = allMicros[nutrient];
          if (values.length > 0) {
              const unit = values[0].unit;
              // Check if all units for this nutrient are the same
              const allUnitsMatch = values.every(v => v.unit === unit);
  
              if (allUnitsMatch) {
                   const sum = values.reduce((acc, curr) => acc + curr.value, 0);
                   totals[nutrient] = { value: sum, unit };
              } else {
                   // Handle mixed units for dashboard total - maybe just show '-' or a warning
                   // For simplicity, we'll skip summing if units are mixed
                   // console.warn(`Skipping dashboard total for ${nutrient} due to mixed units.`);
                   // totals[nutrient] = { value: NaN, unit: 'Mixed' }; // Or some other indicator
              }
          }
      }
  
      const formattedTotals: Record<string, string> = {};
      Object.entries(totals).forEach(([nutrient, { value, unit }]) => {
           if (!isNaN(value)) {
               formattedTotals[nutrient] = `${parseFloat(value.toFixed(1))} ${unit}`; // Avoid trailing .0
           } else {
               formattedTotals[nutrient] = 'Mixed Units'; // Indicate mixed units if not summed
           }
      });
  
      return formattedTotals;
  };
  
  // Gets unique micronutrient names from an array of NutritionalData entries (for Dashboard table header)
  export const getAllDashboardMicronutrientNames = (dataArray: NutritionalData[]): string[] => {
      if (!dataArray || dataArray.length === 0) return [];
  
      const micronutrientSet = new Set<string>();
  
      dataArray.forEach(data => {
          if (data.micronutrients) {
              Object.values(data.micronutrients).forEach(micronutrients => {
                  micronutrients.forEach((micro: any) => { // Use 'any' or refine type if needed
                      micronutrientSet.add(micro.micronutrient);
                  });
              });
          }
      });
  
      // Sort for consistent table headers
      return Array.from(micronutrientSet).sort();
  };

