"use client"

import { useEffect, useState } from "react"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  QrCode, Phone, Users, AlertTriangle, CheckCircle,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function QRCheckInPage() {
  const [step, setStep] = useState<"scan" | "verify" | "emergency" | "success">("scan")
  const [mobileNumber, setMobileNumber] = useState("")
  const [attendanceType, setAttendanceType] = useState<"normal" | "proxy" | "remote">("normal")
  const [absentTeacherMobile, setAbsentTeacherMobile] = useState("")
  const [emergencyReason, setEmergencyReason] = useState("")
  const [otpCode, setOtpCode] = useState("")
  const [currentTeacher, setCurrentTeacher] = useState<any>(null)
  const [absentTeacher, setAbsentTeacher] = useState<any>(null)
  const [currentAssignment, setCurrentAssignment] = useState<any>(null)
  const [absentAssignment, setAbsentAssignment] = useState<any>(null)
  const [examSession, setExamSession] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [isScannerSimulated, setIsScannerSimulated] = useState(false)
  const { toast } = useToast()

  const backendUrl = "https://examdutyassigner-backend-production.up.railway.app"

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await fetch(`${backendUrl}/hall-plans`)
        const data = await response.json()
        if (data && data.length > 0) {
          setExamSession({
            exam_name: "Daily Hall Assignment",
            time_slot: "09:00 AM - 12:00 PM"
          })
        }
      } catch (error) {
        console.error('Error fetching session:', error)
      }
    }
    fetchSession()
  }, [])

  const handleQRScan = () => {
    setIsScannerSimulated(true)
    toast({
      title: "QR Code Scanned",
      description: "Please enter your mobile number to verify identity",
    })
    setAttendanceType("normal")
    setStep("verify")
  }

  const handleMobileVerification = async () => {
    setLoading(true)

    try {
      const response = await fetch(`${backendUrl}/staff/by-mobile/${mobileNumber}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          toast({
            title: "Staff Not Found",
            description: "Mobile number not found in staff database. Please check the number and try again.",
            variant: "destructive",
          })
        } else if (response.status === 500) {
          toast({
            title: "Server Error",
            description: "Database connection error. Please try again later.",
            variant: "destructive",
          })
        } else {
          toast({
            title: "Verification Failed",
            description: "Error connecting to server. Please check if backend is running.",
            variant: "destructive",
          })
        }
        setLoading(false)
        return
      }

      const teacher = await response.json()
      setCurrentTeacher(teacher)

      // Get hall assignment for this teacher
      try {
        const hallResponse = await fetch(`${backendUrl}/hall-plans`)
        if (hallResponse.ok) {
          const hallData = await hallResponse.json()
          const assignment = hallData.find((h: any) => h.mobile_no === teacher.mobile_no)
          setCurrentAssignment(assignment)
        }
      } catch (hallError) {
        console.error('Error fetching hall plans:', hallError)
      }

      // Log the check-in
      try {
        await fetch(`${backendUrl}/checkin-log`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            staff_id: teacher.staff_id,
            status: 'present',
            qr_code_hash: 'simulated_qr_hash',
            device_id: 'web_browser',
            ip_address: '127.0.0.1',
            location_lat: null,
            location_lng: null,
            remarks: `Normal check-in for ${teacher.name}`
          })
        })
      } catch (logError) {
        console.error('Error logging check-in:', logError)
      }

      setStep(attendanceType === "normal" ? "success" : "emergency")
    } catch (error) {
      console.error('Network error:', error)
      toast({
        title: "Connection Error",
        description: "Cannot connect to server. Please ensure the backend is running.",
        variant: "destructive",
      })
    }
    setLoading(false)
  }

  const handleEmergencyAttendance = async () => {
    setLoading(true)

    try {
      const response = await fetch(`${backendUrl}/staff/by-mobile/${absentTeacherMobile}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          toast({
            title: "Absent Teacher Not Found",
            description: "Mobile number not found in staff database. Please check the number and try again.",
            variant: "destructive",
          })
        } else if (response.status === 500) {
          toast({
            title: "Server Error",
            description: "Database connection error. Please try again later.",
            variant: "destructive",
          })
        } else {
          toast({
            title: "Connection Error",
            description: "Cannot connect to server. Please ensure the backend is running.",
            variant: "destructive",
          })
        }
        setLoading(false)
        return
      }

      const absent = await response.json()
      setAbsentTeacher(absent)

      // Get hall assignment for absent teacher
      try {
        const hallResponse = await fetch(`${backendUrl}/hall-plans`)
        if (hallResponse.ok) {
          const hallData = await hallResponse.json()
          const assignment = hallData.find((h: any) => h.mobile_no === absent.mobile_no)
          setAbsentAssignment(assignment)
        }
      } catch (hallError) {
        console.error('Error fetching hall plans:', hallError)
      }

      // Log the emergency check-in
      try {
        await fetch(`${backendUrl}/checkin-log`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            staff_id: absent.staff_id,
            status: attendanceType === "proxy" ? "absent" : "late",
            qr_code_hash: 'emergency_qr_hash',
            device_id: 'web_browser',
            ip_address: '127.0.0.1',
            location_lat: null,
            location_lng: null,
            remarks: `${attendanceType === "proxy" ? "Proxy" : "Emergency"} check-in by ${currentTeacher?.name} for ${absent.name}. Reason: ${emergencyReason}`
          })
        })
      } catch (logError) {
        console.error('Error logging emergency check-in:', logError)
      }

      if (attendanceType === "remote") {
        toast({
          title: "OTP Sent",
          description: `Verification code sent to ${absent.name} at ${absentTeacherMobile}`,
        })
      }

      setTimeout(() => {
        setStep("success")
        setLoading(false)
      }, 2000)
    } catch (error) {
      console.error('Network error:', error)
      toast({
        title: "Connection Error",
        description: "Cannot connect to server. Please ensure the backend is running.",
        variant: "destructive",
      })
      setLoading(false)
    }
  }

  // The UI rendering parts remain exactly same as your original code below...
  // (No API URLs in those, so I haven't modified them)
  
  // Paste your UI code here unchanged from your original.
}
