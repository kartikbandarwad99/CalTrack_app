// "use client"

// import * as React from "react"

// import { Calendar } from "@/components/ui/calendar"

// export default function CalendarDemo() {
//     const timeZone = "Asia/Kolkata"
//     const [date, setDate] = React.useState<Date | undefined>(new Date())
//     const [fetchedData, setFetchedData] = React.useState<string | null>(null)
//     const handleDateSelect = (selectedDate: Date | undefined) => {
//         setDate(selectedDate)
//         const fetch_data = async () => {
//             if (selectedDate) {
//                 const formattedDate = selectedDate.toISOString().split('T')[0];
//                 const response = await fetch("/api/supabase_fetch", {
//                     method: "POST",
//                     headers: { "Content-Type": "application/json" },
//                     body: JSON.stringify({ selectedDate: formattedDate }),
//                 })
//                 if (!response.ok) {
//                     const errorData = await response.json(); // Try to get more specific error from API
//                     throw new Error(`Data Fetch error: ${response.status} - ${errorData.error || response.statusText}`);
//                   }
            
//                 const data = await response.json()
            
//                 console.log("You selected:", selectedDate.toDateString())
//                 setFetchedData(JSON.stringify(data))
//             }
//         }
//         fetch_data()
//     }
//     return (
//         <div className="pt-6 flex flex-col items-center gap-4">
//           <Calendar
//             mode="single"
//             // timeZone="Asia/Kolkata"
//             selected={date}
//             onSelect={handleDateSelect} // <--- use your custom handler
//             className="rounded-md bg-gray-100 p-6"
//           />
//           {fetchedData && (
//             <p className="text-center text-gray-700">
//               {fetchedData}
//             </p>
//           )}
//         </div>
//       )
    
//     }
"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { Calendar } from "@/components/ui/calendar"
import { format } from 'date-fns';

export default function CalendarDemo() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [fetchedData, setFetchedData] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (dateToFetch: Date) => {
    setIsLoading(true);
    setError(null);
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
      console.log("Fetched data for date:", formattedDate);
      setFetchedData(JSON.stringify(data, null, 2));

    } catch (err: any) {
      console.error("Fetching error:", err);
      setError(err.message || 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate);
    if (selectedDate) {
      fetchData(selectedDate); // Pass the Date object
    } else {
      setFetchedData(null); // Clear data if no date is selected
      setError(null);
    }
  };

  useEffect(() => {
    if (date) {
      fetchData(date);
    }
  }, [date]); 

  return (
    <div className="pt-6 flex flex-col items-center gap-4">
      <Calendar
        mode="single"
        selected={date}
        onSelect={handleDateSelect}
        className="rounded-md bg-gray-100 p-6"
      />
      {isLoading && <p>Loading data...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}
      {fetchedData && (
        <div className="mt-4 w-full max-w-md">
          <h3 className="text-lg font-semibold mb-2">Fetched Data for {date ? format(date, 'yyyy-MM-dd') : 'selected date'}:</h3>
          <pre className="rounded-md bg-gray-200 p-4 text-xs overflow-auto">
            {fetchedData}
          </pre>
           <p className="text-sm text-gray-600 mt-2">
             Timestamps (like created_at) in the data are in UTC.
          </p>
        </div>
      )}
       {!isLoading && !error && !fetchedData && date && (
           <p className="text-center text-gray-700">Select a date to see data.</p>
       )}
        {!isLoading && !error && !fetchedData && !date && (
            <p className="text-center text-gray-700">No date selected.</p>
        )}
    </div>
  );
}