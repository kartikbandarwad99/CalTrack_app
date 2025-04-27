// app/dashboard/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, Tooltip, Label, ResponsiveContainer } from "recharts";
import { useRouter } from 'next/navigation';
import { ArrowLeft, Trash2, MessageSquare, LayoutDashboard, Plus, Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format } from 'date-fns';

import {
    NutritionalData,
    calculateTotalDashboardMacros,
    calculateTotalDashboardMicros,
    getAllDashboardMicronutrientNames
} from "@/lib/nutri-utils";

const MACRO_COLORS = ["#8884d8", "#82ca9d", "#ffc658"];

// Helper to safely access item ID regardless of structure
const getItemId = (item: any): string | number | undefined => {
    return (item.Data || item).id;
};


export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState<NutritionalData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [fetchedData, setFetchedData] = useState<any[] | null>(null);
  const [isCalendarDataLoading, setIsCalendarDataLoading] = useState<boolean>(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [showingCalendarData, setShowingCalendarData] = useState<boolean>(false);
  const [isDeletingId, setIsDeletingId] = useState<string | number | null>(null); // State to track which item is being deleted

  const router = useRouter();

  useEffect(() => {
    try {
      const savedDataString = localStorage.getItem('dashboardData');
      if (savedDataString) {
        const savedData: NutritionalData[] = JSON.parse(savedDataString);
        setDashboardData(savedData);
      }
    } catch (error) {
      console.error("Error loading data from localStorage:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);


  const handleDateSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate);
    if (selectedDate) {
      fetchData(selectedDate);
      // Automatically switch to showing calendar data when a date is selected
      setShowingCalendarData(true);
    } else {
      setFetchedData(null);
      setCalendarError(null);
      setShowingCalendarData(false); 
    }
  };

   useEffect(() => {
    if (date) {
      fetchData(date);
    } else {
        setFetchedData(null);
        setCalendarError(null);
    }
  }, [date]); 


  const handleDeleteItem = (indexToDelete: number) => {
    try {
      const updatedData = dashboardData.filter((_, index) => index !== indexToDelete);
      setDashboardData(updatedData);
      localStorage.setItem('dashboardData', JSON.stringify(updatedData));
      console.log(`Deleted localStorage item at index ${indexToDelete}`);
    } catch (error) {
      console.error("Error deleting item from localStorage dashboard:", error);
      alert("Could not delete item from dashboard.");
    }
  };

  const handleDeleteSupabaseItem = async (itemId: string | number) => {
    if (!confirm("Are you sure you want to delete this record?")) {
      return; 
    }

    setIsDeletingId(itemId); 
    setCalendarError(null);

    try {
      const response = await fetch("/api/supabase_delete", {
        method: "POST", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: itemId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Deletion error: ${response.status} - ${errorData.message || response.statusText}`);
      }

      // Assuming successful deletion, update the fetchedData state
      setFetchedData(prevData => {
        if (!prevData) return null;
        return prevData.filter(item => getItemId(item) !== itemId);
      });

      console.log(`Deleted Supabase item with ID ${itemId}`);

    } catch (err: any) {
      console.error("Supabase deletion error:", err);
      setCalendarError(err.message || 'An unknown error occurred during deletion');
      alert(`Could not delete item: ${err.message}`);
    } finally {
      setIsDeletingId(null); 
    }
  };

  const fetchData = async (dateToFetch: Date) => {
    setIsCalendarDataLoading(true);
    setCalendarError(null);
    setFetchedData(null);

    try {
      const formattedDate = format(dateToFetch, 'yyyy-MM-dd');
      console.log("Fetching data for date string:", formattedDate);

      const response = await fetch("/api/supabase_fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedDateString: formattedDate,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Data Fetch error: ${response.status} - ${errorData.message || response.statusText}`);
      }

      const data = await response.json();
      console.log("Fetched data:", data);
      const processedData = data.map((item: any) => {
        const originalData = item.Data || item;

        let totalCalories = 0;
        let totalProtein = 0;
        let totalCarbs = 0;
        let totalFats = 0;

        if (originalData.macronutrients && Array.isArray(originalData.macronutrients)) {
          originalData.macronutrients.forEach((macro: any) => {
            totalCalories += parseFloat(macro.calories) || 0;
            totalProtein += parseFloat(macro.protein_g) || 0;
            totalCarbs += parseFloat(macro.carbs_g) || 0;
            totalFats += parseFloat(macro.fats_g) || 0;
          });
        }

        return {
          id: item.id,
          food_name: originalData.foodItems || "Unknown Food",
          calories: totalCalories, 
          protein: totalProtein,
          carbs: totalCarbs,
          fats: totalFats, 
          micronutrients: originalData.micronutrients || {},
          macronutrients: originalData.macronutrients || [],
          timestamp: originalData.Date || format(dateToFetch, 'yyyy-MM-dd')
        };
      });

      console.log("Processed data with IDs:", processedData);
      setFetchedData(processedData);

      if (processedData.length > 0 || calendarError === null) { 
         setShowingCalendarData(true);
      }

    } catch (err: any) {
      console.error("Fetching error:", err);
      setCalendarError(err.message || 'An unknown error occurred during fetch');
      setFetchedData(null); 
      setShowingCalendarData(true);
    } finally {
      setIsCalendarDataLoading(false);
    }
  };

  const convertApiDataToNutritionalFormat = (apiData: any[]): NutritionalData[] => {
    return apiData.map(item => {
      return {
        foodItems: item.food_name || "Unknown Food",
        calories: item.calories?.toString() || "0",
        protein: item.protein?.toString() || "0",
        carbs: item.carbs?.toString() || "0",
        fats: item.fats?.toString() || "0",
        micronutrients: item.micronutrients || {}, 
        macronutrients: item.macronutrients || [],
        timestamp: item.timestamp
      };
    });
  };

   const getDefaultUnit = (nutrientName: string): string => {
    const lowerName = nutrientName.toLowerCase();

    if (lowerName.includes('vitamin')) return 'mcg';
    if (['calcium', 'potassium', 'sodium', 'magnesium', 'phosphorus', 'zinc', 'iron'].includes(lowerName)) return 'mg';
    if (['fiber', 'sugar'].includes(lowerName)) return 'g';
    return 'mg'; 
  };

    const handleResetToDashboardData = () => {
        setDate(undefined); 
        setFetchedData(null);
        setCalendarError(null); 
        setShowingCalendarData(false); 
    };

    const dataForCalculations = React.useMemo(() => {
      if (showingCalendarData && fetchedData && Array.isArray(fetchedData) && fetchedData.length > 0) {
        // Convert fetched Supabase data format to NutritionalData format for calculations
        return convertApiDataToNutritionalFormat(fetchedData);
      }
      return dashboardData;
    }, [showingCalendarData, fetchedData, dashboardData]);


  const totalMacros = calculateTotalDashboardMacros(dataForCalculations);
  const totalMicros = calculateTotalDashboardMicros(dataForCalculations);
  const allMicronutrientNames = getAllDashboardMicronutrientNames(dataForCalculations);


  const macroPieData = [
    { name: "Protein", value: totalMacros.protein, fill: MACRO_COLORS[0] },
    { name: "Carbs", value: totalMacros.carbs, fill: MACRO_COLORS[1] },
    { name: "Fats", value: totalMacros.fats, fill: MACRO_COLORS[2] }
  ].filter(item => item.value > 0);

  const navigateBackToChat = () => {
    router.push('/chat');
  };

  const handleClearDashboardData = () => {
    if (!confirm("Are you sure you want to clear ALL data from the dashboard? This only affects local data, not saved history.")) {
        return; // User cancelled
    }
    try {
      localStorage.removeItem('dashboardData');
      setDashboardData([]);
      alert("All local dashboard data cleared!");
    } catch (error) {
       console.error("Error clearing all data from localStorage:", error);
       alert("Could not clear all dashboard data.");
    }
  };

  const nutrientDisplayTitle = showingCalendarData && date && fetchedData !== null 
    ? `Nutrients for ${format(date, 'yyyy-MM-dd')}`
    : "Total Dashboard Nutrients";


  return (
    <div className="min-h-screen bg-gray-100 p-6 flex flex-col">
       {/* ... (Navbar) */}
       <nav className="bg-white shadow-md p-4 mb-6">
          <div className="container mx-auto flex justify-between items-center">
             <button
               onClick={navigateBackToChat}
               className="flex items-center text-gray-600 hover:text-gray-800 transition px-3 py-1 rounded-md hover:bg-gray-200"
             >
               <ArrowLeft size={20} className="mr-1" /> Back to Chat
             </button>
             <h1 className="text-xl font-bold">Nutritional Dashboard</h1>
             {!showingCalendarData && dashboardData.length > 0 && (
                <button
                   onClick={handleClearDashboardData}
                   className="flex items-center text-red-600 hover:text-red-800 transition px-3 py-1 rounded-md hover:bg-gray-200"
                   title="Clear all dashboard data (local storage)"
                >
                   <Trash2 size={20} className="mr-1" /> Clear Local
                </button>
             )}
             {/* {showingCalendarData && ( 
                 <button
                    onClick={handleResetToDashboardData}
                    className="flex items-center text-gray-600 hover:text-gray-800 transition px-3 py-1 rounded-md hover:bg-gray-200"
                    title="Return to Dashboard Data"
                 >
                   <LayoutDashboard size={20} className="mr-1" /> View Dashboard
                 </button>
             )} */}
          </div>
       </nav>


      {isLoading ? (
        <div className="flex-1 flex justify-center items-center text-lg text-gray-600">Loading dashboard...</div>
      ) : (
         <div className="container mx-auto space-y-8 flex-1 overflow-y-auto">

          {/* Calendar Card */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-center flex items-center justify-center">
                <CalendarIcon className="mr-2" size={20} /> Nutritional History Calendar
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col md:flex-row items-start justify-around p-6">
              <div className="w-full md:w-1/2 mb-6 md:mb-0 flex justify-center">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={handleDateSelect}
                  className="rounded-md bg-gray-100 p-6"
                />
              </div>

              <div className="w-full md:w-1/2">
                {isCalendarDataLoading && (
                  <div className="text-center py-8">
                    <p className="text-gray-600">Loading data...</p>
                  </div>
                )}

                {/* Show calendar error regardless of data presence */}
                {calendarError && (
                  <div className="text-center py-4">
                    <p className="text-red-500">Error: {calendarError}</p>
                  </div>
                )}

                {!isCalendarDataLoading && fetchedData && (
                  <div className="rounded-md bg-gray-100 p-4">
                    <h3 className="text-lg font-semibold mb-4">Data for {date ? format(date, 'yyyy-MM-dd') : 'selected date'}:</h3>

                    {/* Check if fetchedData is an array and has items */}
                    {Array.isArray(fetchedData) && fetchedData.length > 0 ? (
                      <div className="space-y-4">
                        <p className="text-sm text-gray-700">Found {fetchedData.length} records</p>

                        <div className="overflow-auto max-h-96">
                          <table className="min-w-full bg-white border border-gray-300">
                            <thead>
                              <tr className="bg-gray-200">
                                <th className="py-2 px-4 border">Food Item</th>
                                <th className="py-2 px-4 border">Calories</th>
                                <th className="py-2 px-4 border">Protein</th>
                                <th className="py-2 px-4 border">Carbs</th>
                                <th className="py-2 px-4 border">Fats</th>
                                <th className="py-2 px-4 border text-center">Actions</th> {/* New Actions Header */}
                              </tr>
                            </thead>
                            <tbody>
                              {fetchedData.map((item: any, index: number) => {
                                const itemId = getItemId(item); 
                                return (
                                  <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                    <td className="py-2 px-4 border">{item.food_name || "N/A"}</td>
                                    <td className="py-2 px-4 border text-center">{item.calories || "N/A"}</td>
                                    <td className="py-2 px-4 border text-center">{item.protein ? `${item.protein.toFixed(1)}g` : "N/A"}</td>
                                    <td className="py-2 px-4 border text-center">{item.carbs ? `${item.carbs.toFixed(1)}g` : "N/A"}</td>
                                    <td className="py-2 px-4 border text-center">{item.fats ? `${item.fats.toFixed(1)}g` : "N/A"}</td>
                                    <td className="py-2 px-4 border text-center">
                                      {itemId !== undefined && ( // Only show button if ID is available
                                        <button
                                          onClick={() => handleDeleteSupabaseItem(itemId)}
                                          className="text-red-500 hover:text-red-700 p-1 rounded-md hover:bg-gray-200 transition"
                                          title="Delete Item"
                                          disabled={isDeletingId === itemId} // Disable while deleting this item
                                        >
                                          {isDeletingId === itemId ? '...' : <Trash2 size={16} />} {/* Show loading indicator */}
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-700 text-center py-4">No nutritional data found for this date.</p>
                    )}
                  </div>
                )}

                {!isCalendarDataLoading && !fetchedData && !calendarError && (
                  <div className="text-center py-12 bg-gray-100 rounded-md">
                    <p className="text-gray-600">Select a date to view nutritional history</p>
                  </div>
                )}
                 {/* If calendarError is shown above, this section might not be needed */}
                 {/* {!isCalendarDataLoading && calendarError && (
                     <div className="text-center py-8">
                       <p className="text-red-500">Error fetching data: {calendarError}</p>
                     </div>
                   )} */}
              </div>
            </CardContent>
          </Card>

          {/* Conditional Rendering based on showingCalendarData */}
          {((!showingCalendarData && dashboardData.length === 0) || (showingCalendarData && fetchedData !== null && Array.isArray(fetchedData) && fetchedData.length === 0 && !isCalendarDataLoading && !calendarError)) ? (
            // This block shows the "No data yet" message.
            // It appears if:
            // 1. Not showing calendar data AND dashboardData is empty.
            // OR
            // 2. Showing calendar data AND fetchedData is an empty array (after loading) AND no error occurred.
            <div className="text-center text-gray-600 text-lg mt-8 flex flex-col items-center">
              {showingCalendarData ? (
                 <><CalendarIcon size={48} className="mb-4 text-gray-400" />
                 <p>No nutritional data saved for this date.</p></>
              ) : (
                <><LayoutDashboard size={48} className="mb-4 text-gray-400" />
                <p>No nutritional data has been added to the dashboard yet.</p>
                <p>Go back to the chat page and click the <Plus size={16} className="inline-block" /> icon on a breakdown to add it here.</p></>
              )}
              <button
                onClick={navigateBackToChat}
                className="mt-6 flex items-center text-blue-600 hover:text-blue-800 transition px-4 py-2 rounded-full border border-blue-600 hover:border-blue-800"
              >
                <MessageSquare size={20} className="mr-2"/> Go to Chat
              </button>
            </div>
          ) : (
            // This block shows the nutrient charts and tables
            <>

              {/* Total Macronutrients Card - Uses dataForCalculations */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-center">{nutrientDisplayTitle} - Macronutrients</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col md:flex-row items-center justify-around p-6">
                  {macroPieData.length > 0 ? (
                     <div className="w-full md:w-1/2 h-[300px] mb-6 md:mb-0">
                       <ResponsiveContainer width="100%" height="100%">
                         <PieChart>
                            <Tooltip formatter={(value, name) => {
                            const numValue = typeof value === 'number' ? value : parseFloat(String(value)) || 0;
                            const formattedValue = numValue.toFixed(1);
                            return [`${formattedValue}g`, name];
                            }} />
                           <Pie
                             data={macroPieData}
                             dataKey="value"
                             nameKey="name"
                             cx="50%"
                             cy="50%"
                             innerRadius={60}
                             outerRadius={100}
                             strokeWidth={5}
                             label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                             labelLine={false}
                           >
                             {macroPieData.map((entry, index) => (
                               <Cell key={`cell-${index}`} fill={entry.fill} />
                             ))}
                           </Pie>
                            <Label
                             content={({ viewBox }) => {
                               if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                                 const cx = viewBox.cx || 0;
                                 const cy = viewBox.cy || 0;
                                 return (
                                   <text
                                     x={`${cx}`}
                                     y={`${cy}`}
                                     textAnchor="middle"
                                     dominantBaseline="middle"
                                   >
                                     <tspan
                                       x={`${cx}`}
                                       y={`${cy}`}
                                       className="fill-foreground text-3xl font-bold"
                                     >
                                       {totalMacros.calories.toFixed(0)}
                                     </tspan>
                                     <tspan
                                       x={`${cx}`}
                                       y={`${cy + 24}`}
                                       className="fill-muted-foreground text-sm"
                                     >
                                       Calories Total
                                     </tspan>
                                   </text>
                                 );
                               }
                               return null;
                             }}
                           />
                         </PieChart>
                       </ResponsiveContainer>
                     </div>
                  ) : (
                      <div className="w-full text-center text-gray-500 h-[300px] flex items-center justify-center">No macro data available for charting.</div>
                  )}

                   {/* Macro Summary Table - Uses totalMacros */}
                   <div className="w-full md:w-1/2 overflow-x-auto">
                      <h4 className="text-lg font-semibold text-center mb-2">Summary Table</h4>
                       {macroPieData.length > 0 ? ( // Only show table if there's macro data
                           <table className="table-auto w-full text-left border-collapse border border-gray-300">
                               <thead>
                                   <tr className="bg-gray-200">
                                       <th className="border p-2">Nutrient</th>
                                       <th className="border p-2">Total</th>
                                   </tr>
                               </thead>
                               <tbody>
                                   <tr className="bg-white">
                                       <td className="border p-2">Calories</td>
                                       <td className="border p-2">{totalMacros.calories.toFixed(0)}</td>
                                   </tr>
                                   <tr className="bg-gray-50">
                                       <td className="border p-2">Protein</td>
                                       <td className="border p-2">{totalMacros.protein.toFixed(1)} g</td>
                                   </tr>
                                   <tr className="bg-white">
                                       <td className="border p-2">Carbohydrates</td>
                                       <td className="border p-2">{totalMacros.carbs.toFixed(1)} g</td>
                                   </tr>
                                   <tr className="bg-gray-50">
                                       <td className="border p-2">Fats</td>
                                       <td className="border p-2">{totalMacros.fats.toFixed(1)} g</td>
                                   </tr>
                               </tbody>
                           </table>
                       ) : (
                           <p className="text-center text-gray-500">No macro summary data available.</p>
                       )}
                   </div>
                </CardContent>
              </Card>

              {/* Total Micronutrients Card - Uses allMicronutrientNames and totalMicros */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-center">{nutrientDisplayTitle} - Micronutrients</CardTitle>
                </CardHeader>
                <CardContent className="p-6 overflow-x-auto">
                  {allMicronutrientNames.length > 0 ? (
                     <table className="table-auto w-full text-left border-collapse border border-gray-300 text-sm">
                       <thead>
                         <tr className="bg-gray-200">
                           <th className="border p-2">Micronutrient</th>
                           <th className="border p-2">Total Amount</th>
                         </tr>
                       </thead>
                       <tbody>
                         {allMicronutrientNames.map((name, index) => (
                           <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                             <td className="border p-2">{name}</td>
                             {/* Safely display micronutrient total, add unit if possible */}
                             <td className="border p-2">
                               {totalMicros[name] !== undefined ?
                                `${totalMicros[name]} ${getDefaultUnit(name)}` // Add a default unit
                                : '-'}
                             </td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                  ) : (
                      <p className="text-center text-gray-500">No micronutrient data available in selected items.</p>
                  )}
                </CardContent>
              </Card>

               {/* List of items added - only show for dashboard data (localStorage) */}
               {!showingCalendarData && (
                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-center">Items Added to Dashboard (Local)</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        {dashboardData.length > 0 ? (
                            <ul className="space-y-3">
                                {dashboardData.map((item, index) => (
                                    <li key={index} className="flex items-center justify-between border-b last:border-b-0 pb-3 text-sm">
                                       <span className="font-medium mr-4">{item.foodItems} ({item.timestamp})</span>
                                       <button
                                          onClick={() => handleDeleteItem(index)} // This calls the localStorage delete
                                          className="text-red-500 hover:text-red-700 p-1 rounded-md hover:bg-gray-200 transition"
                                          title="Delete Item from Local Dashboard"
                                       >
                                          <Trash2 size={16} />
                                       </button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-center text-gray-500">No items added to local dashboard yet.</p>
                        )}
                    </CardContent>
                </Card>
               )}
            </>
          )}
         </div>
      )}
    </div>
  );
}