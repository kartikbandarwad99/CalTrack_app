'use client'

import { useState, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Plus, Mic, Send, ImageIcon, Loader2, ChevronDown, ChevronUp, Trash2, LayoutDashboard, Calendar } from "lucide-react" // Added Calendar icon
import Image from "next/image"
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Label,
  ResponsiveContainer,
} from "recharts"
import { useRouter } from 'next/navigation'
import { format } from "date-fns"
import { Message, NutritionalData, calculateTotals, getMicronutrientTableData, getMicronutrientNames, calculateMicronutrientTotals } from "@/lib/nutri-utils"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"

// Base colors for macronutrients
const MACRO_COLORS = ["#8884d8", "#82ca9d", "#ffc658"] // Protein, Carbs, Fats

type ExpandedState = Record<number, boolean>;

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [nutritionalData, setNutritionalData] = useState<NutritionalData[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [expandedStates, setExpandedStates] = useState<ExpandedState>({})
  const router = useRouter()
  
  // Add date picker state
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())

  const sendMessage = async () => {
    if (imageUrl) {
      await processImageWithText();
      return;
    }

    if (!input.trim()) return;

    const userMessage: Message = {
      text: input.trim(),
      sender: "user"
    }

    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput("")

    try {
      setIsProcessing(true)

      const formattedMessages = updatedMessages.map(m => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.text || ""
      }))

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: formattedMessages })
      })

      const data = await response.json()
      let botMessage: Message

      try {
        const parsed = JSON.parse(data.reply)
        if (parsed?.type === "nutritional_breakdown") {
          const newNutritionalData = {
            ...parsed.data,
            timestamp: selectedDate ? format(selectedDate, 'MMM dd, yyyy HH:mm') : new Date().toLocaleString(), // Use selected date
            foodItems: parsed.data.macronutrients.map((item: any) => `${item.quantity} ${item.foodItem}`).join(", ")
          }
          setNutritionalData(prev => [...prev, newNutritionalData])
          botMessage = { text: "Here's your nutritional breakdown chart:", sender: "bot" }
        } else {
          botMessage = { text: data.reply, sender: "bot" }
        }
      } catch (err) {
        // If JSON parsing fails, treat it as a regular text reply
        botMessage = { text: data.reply, sender: "bot" }
      }

      setMessages(prev => [...prev, botMessage])
    } catch (err: any) {
      console.error("Chat API Error:", err)
      setMessages(prev => [...prev, { text: `⚠️ Error fetching response: ${err.message || err}`, sender: "bot" }])
    } finally {
      setIsProcessing(false)
    }
  }

  const processImageWithText = async () => {
    if (!imageUrl) return;

    try {
      setIsProcessing(true)

      const userMessage: Message = {
        text: input.trim() || "Analyze this food image",
        image: imageUrl,
        sender: "user"
      }

      setMessages(prev => [...prev, userMessage])
      setInput("")
      setImageUrl(null)

      const response = await fetch("/api/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: userMessage.image,
          description: userMessage.text
        })
      })

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Image processing error: ${response.status} - ${errorData.error || response.statusText}`);
      }

      const data = await response.json()
      let botMessage: Message

      try {
        const parsed = data
        if (parsed?.type === "nutritional_breakdown") {
          const newNutritionalData: NutritionalData = {
            ...parsed.data,
            timestamp: selectedDate ? format(selectedDate, 'MMM dd, yyyy HH:mm') : new Date().toLocaleString(), // Use selected date
            foodItems: parsed.data.macronutrients.map((item: any) => `${item.quantity} ${item.foodItem}`).join(", ")
          }
          setNutritionalData(prev => [...prev, newNutritionalData])
          botMessage = { text: "Here's your nutritional breakdown chart:", sender: "bot" }
        } else {
          botMessage = { text: data.reply || "Analysis complete.", sender: "bot" }
        }
      } catch (err) {
        console.error("Image API Response Processing Error:", err)
        botMessage = {
          text: data.reply || "Could not extract detailed info from the image.",
          sender: "bot"
        }
      }

      setMessages(prev => [...prev, botMessage])

    } catch (err: any) {
      console.error("Image Processing Error:", err)
      setMessages(prev => [...prev, {
        text: `⚠️ Error processing image: ${err.message || err}`,
        sender: "bot"
      }])
    } finally {
      setIsProcessing(false)
    }
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImageUrl(reader.result)
      }
    }
    reader.readAsDataURL(file)
  }

  // const handleVoiceInput = () => {
  //   const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  //   if (!SpeechRecognition) {
  //     console.warn("Speech recognition not supported in this browser.");
  //     alert("Speech recognition not supported in your browser.");
  //     return;
  //   }

  //   const recognition = new SpeechRecognition()
  //   recognition.lang = 'en-US'
  //   recognition.interimResults = false
  //   recognition.maxAlternatives = 1

  //   recognition.onresult = (event: SpeechRecognitionEvent) => {
  //     const transcript = (event as any).results[0][0].transcript
  //     setInput(transcript)
  //   }

  //   recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
  //     console.error("Speech recognition error", event.error)
  //   }

  //   recognition.start()
  // }

  const removeNutritionalData = (index: number) => {
    setNutritionalData(prev => prev.filter((_, i) => i !== index));
    setExpandedStates(prev => {
      const newState = { ...prev };
      delete newState[index];
      return newState;
    });
  }

  const handleAddToDashboard = async (data: NutritionalData) => {
    try {
      console.log("handleAddToDashboard: START. Data received:", data);
      
      const selectedDateString = selectedDate 
        ? format(selectedDate, 'yyyy-MM-dd') 
        : format(new Date(), 'yyyy-MM-dd');
      
      console.log("handleAddToDashboard: Selected date formatted:", selectedDateString);
      
      const response = await fetch("/api/supabase_insert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          selectedDateString
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Supabase insert error: ${response.status} - ${errorData.message || response.statusText}`);
      }
      
      const result = await response.json();
      console.log("handleAddToDashboard: Supabase insert successful. Result:", result);
      
      alert("Added to dashboard!");
      console.log("handleAddToDashboard: END (Successful path)");
    } catch (error: any) {
      console.error("handleAddToDashboard: CATCH BLOCK triggered! Error:", error);
      alert(`Could not save data to dashboard: ${error.message}`);
      console.log("handleAddToDashboard: END (Error path)");
    }
  };
  

  const toggleExpand = (index: number) => {
    setExpandedStates(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const navigateToDashboard = () => {
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <nav className="bg-white shadow-md p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">CalTrack</h1>
          <button
            className="rounded-full px-4 py-2 font-medium bg-gray-200 hover:bg-gray-300 transition flex items-center gap-2"
            onClick={navigateToDashboard}
          >
            <LayoutDashboard size={20} /> View Dashboard
          </button>
        </div>
      </nav>

      {/* Date Picker Section */}
      <div className="bg-white shadow-sm py-3">
        <div className="container mx-auto flex justify-between items-center px-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">Log date:</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  className="flex items-center gap-2 text-sm font-normal h-9"
                >
                  <Calendar className="h-4 w-4" />
                  {selectedDate ? format(selectedDate, 'PPP') : 'Select date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="text-sm text-gray-500">
            {selectedDate ? `Logging foods for ${format(selectedDate, 'MMM dd, yyyy')}` : 'Select a date'}
          </div>
        </div>
      </div>

      {/* Main Chat & History Area */}
      <div className="flex justify-center items-start mt-6 px-4 flex-1 overflow-hidden">
        <Card className="w-full max-w-4xl h-full flex flex-col shadow-lg rounded-2xl text-base">
          <CardContent className="flex-1 overflow-y-auto p-6 space-y-3 flex flex-col">
            {/* Chat messages */}
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={cn(
                  "p-4 rounded-xl max-w-3xl whitespace-pre-wrap break-words",
                  msg.sender === "user" ? "bg-blue-200 self-end" : "bg-gray-200 self-start"
                )}
              >
                {msg.text && <p>{msg.text}</p>}
                {msg.image && (
                  <div className="mt-2">
                    <Image
                      src={msg.image}
                      alt="Uploaded food"
                      width={300}
                      height={300}
                      className="rounded-lg object-cover"
                    />
                  </div>
                )}
              </div>
            ))}

            {/* Nutritional Data History */}
            {nutritionalData.length > 0 && (
              <div className="mt-4 space-y-6">
                <h3 className="text-xl font-bold text-center">Nutritional Breakdown History</h3>

                {nutritionalData.map((data, dataIndex) => {
                  const totals = calculateTotals(data)
                  const macronutrientData = [
                    { name: "Protein", value: totals.protein, fill: MACRO_COLORS[0] },
                    { name: "Carbs", value: totals.carbs, fill: MACRO_COLORS[1] },
                    { name: "Fats", value: totals.fats, fill: MACRO_COLORS[2] }
                  ]
                  const micronutrientData = getMicronutrientTableData(data)
                  const micronutrientNames = getMicronutrientNames(data)
                  const microTotals = calculateMicronutrientTotals(data)
                  const isExpanded = expandedStates[dataIndex] || false;

                  return (
                    <div key={dataIndex} className="border rounded-lg overflow-hidden">
                      <div
                        className="p-3 bg-gray-100 hover:bg-gray-200 cursor-pointer flex justify-between items-center"
                        onClick={() => toggleExpand(dataIndex)}
                      >
                        <div className="font-medium text-sm">
                          {data.foodItems} - {data.timestamp}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleAddToDashboard(data)
                            }}
                            className="text-green-500 hover:text-green-700 p-1 rounded-md hover:bg-gray-300 transition"
                            title="Add to Dashboard"
                          >
                            <Plus size={16} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              removeNutritionalData(dataIndex)
                            }}
                            className="text-red-500 hover:text-red-700 p-1 rounded-md hover:bg-gray-300 transition"
                            title="Remove"
                          >
                            <Trash2 size={16} />
                          </button>
                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="p-4 space-y-6 bg-white">
                          {/* Macronutrients Donut */}
                          <div className="w-full max-w-xs mx-auto">
                            <h4 className="text-base font-semibold text-center mb-2">Macros Summary</h4>
                            <ResponsiveContainer width="100%" height={200}>
                              <PieChart>
                                <Tooltip formatter={(value, name) => [`${value}g`, name]} />
                                <Pie
                                  data={macronutrientData}
                                  dataKey="value"
                                  nameKey="name"
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={40}
                                  outerRadius={70}
                                  strokeWidth={5}
                                  label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                                  labelLine={false}
                                >
                                  {macronutrientData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                  ))}
                                  <Label
                                    content={({ viewBox }) => {
                                      if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                                        const cx = viewBox.cx || 0;
                                        const cy = viewBox.cy || 0;
                                        return (
                                          <text
                                            x={cx}
                                            y={cy}
                                            textAnchor="middle"
                                            dominantBaseline="middle"
                                          >
                                            <>
                                              <tspan
                                                x={cx}
                                                y={cy - 8}
                                                className="fill-foreground text-xl font-bold"
                                              >
                                                {totals.calories}
                                              </tspan>
                                              <tspan
                                                x={cx}
                                                y={cy + 12}
                                                className="fill-muted-foreground text-xs"
                                              >
                                                Calories
                                              </tspan>
                                            </>
                                          </text>
                                        );
                                      }
                                      return null;
                                    }}
                                  />
                                </Pie>
                              </PieChart>
                            </ResponsiveContainer>
                            <div className="text-center text-sm mt-2">
                              Protein: {totals.protein.toFixed(1)}g | Carbs: {totals.carbs.toFixed(1)}g | Fats: {totals.fats.toFixed(1)}g
                            </div>
                          </div>

                          {/* Macronutrients Table */}
                          <div className="overflow-x-auto">
                            <h4 className="text-base font-semibold text-center mb-2">Per-Food Macros</h4>
                            <table className="table-auto w-full text-left border-collapse border border-gray-300 text-xs">
                              <thead>
                                <tr className="bg-gray-200">
                                  <th className="border p-2">Food</th>
                                  <th className="border p-2">Quantity</th>
                                  <th className="border p-2">Calories</th>
                                  <th className="border p-2">Protein (g)</th>
                                  <th className="border p-2">Carbs (g)</th>
                                  <th className="border p-2">Fats (g)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {data.macronutrients.map((item: any, index: number) => (
                                  <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                    <td className="border p-2">{item.foodItem}</td>
                                    <td className="border p-2">{item.quantity}</td>
                                    <td className="border p-2">{item.calories}</td>
                                    <td className="border p-2">{item.protein_g}</td>
                                    <td className="border p-2">{item.carbs_g}</td>
                                    <td className="border p-2">{item.fats_g}</td>
                                  </tr>
                                ))}
                                <tr className="font-bold bg-gray-100">
                                  <td className="border p-2">Total</td>
                                  <td className="border p-2">-</td>
                                  <td className="border p-2">{totals.calories}</td>
                                  <td className="border p-2">{totals.protein.toFixed(1)}</td>
                                  <td className="border p-2">{totals.carbs.toFixed(1)}</td>
                                  <td className="border p-2">{totals.fats.toFixed(1)}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          {/* Micronutrients Table */}
                          <div className="overflow-x-auto">
                            <h4 className="text-base font-semibold text-center mb-2">Micronutrients</h4>
                            {micronutrientData.length > 0 ? (
                              <table className="table-auto w-full text-left border-collapse border border-gray-300 text-xs">
                                <thead>
                                  <tr className="bg-gray-200">
                                    <th className="border p-2">Food Item</th>
                                    {micronutrientNames.map((name, index) => (
                                      <th key={index} className="border p-2">{name}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {micronutrientData.map((item: any, index: number) => (
                                    <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                      <td className="border p-2">{item.foodItem}</td>
                                      {micronutrientNames.map((name, idx) => (
                                        <td key={idx} className="border p-2">{item[name] || '-'}</td>
                                      ))}
                                    </tr>
                                  ))}
                                  <tr className="font-bold bg-gray-100">
                                    <td className="border p-2">Total</td>
                                    {micronutrientNames.map((name, idx) => (
                                      <td key={idx} className="border p-2">{microTotals[name] || '-'}</td>
                                    ))}
                                  </tr>
                                </tbody>
                              </table>
                            ) : (
                              <p className="text-center text-gray-500 text-sm">No micronutrient data available</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>

          {/* Input area */}
          <div className="p-4 border-t">
            <div className="relative flex items-center space-x-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer p-1 rounded-md hover:bg-gray-200 transition"
                disabled={isProcessing}
                title="Upload Image"
              >
                <ImageIcon className="w-6 h-6 text-gray-500 hover:text-black" />
              </button>
              <input
                type="file"
                id="upload"
                accept="image/*"
                ref={fileInputRef}
                className="hidden"
                onChange={handleImageUpload}
                disabled={isProcessing}
              />

              {/* <button
                onClick={handleVoiceInput}
                className="p-1 rounded-md hover:bg-gray-200 transition"
                disabled={isProcessing}
                title="Voice Input"
              >
                <Mic className="w-6 h-6 text-gray-500 hover:text-black cursor-pointer" style={{ opacity: isProcessing ? 0.5 : 1 }} />
              </button> */}

              <Input
                placeholder={imageUrl ? "Add description for this food image (optional)..." : "Type your message..."}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isProcessing) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                className="pr-12 text-base"
                disabled={isProcessing}
              />
              {isProcessing ? (
                <Loader2 className="absolute right-4 top-1/2 transform -translate-y-1/2 w-6 h-6 text-gray-500 animate-spin" />
              ) : (
                <button
                  onClick={sendMessage}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 rounded-md hover:bg-gray-200 transition"
                  disabled={isProcessing && !imageUrl}
                  title="Send"
                >
                  <Send
                    className={cn(
                      "w-6 h-6 text-gray-500 cursor-pointer",
                      (!input.trim() && !imageUrl) || isProcessing ? "opacity-50 cursor-not-allowed" : "hover:text-black"
                    )}
                  />
                </button>
              )}
            </div>

            {imageUrl && (
              <div className="mt-3 flex justify-start">
                <div className="relative">
                  <Image
                    src={imageUrl}
                    alt="Preview"
                    width={100}
                    height={100}
                    className="rounded-md border object-cover"
                  />
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}