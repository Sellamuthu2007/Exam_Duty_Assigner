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

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await fetch('http://localhost:3000/hall-plans')
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
      const response = await fetch(`http://localhost:3000/staff/by-mobile/${mobileNumber}`)
      
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
        const hallResponse = await fetch('http://localhost:3000/hall-plans')
        if (hallResponse.ok) {
          const hallData = await hallResponse.json()
          const assignment = hallData.find((h: any) => h.mobile_no === teacher.mobile_no)
          setCurrentAssignment(assignment)
        }
      } catch (hallError) {
        console.error('Error fetching hall plans:', hallError)
        // Don't fail the check-in if hall plans can't be fetched
      }

      // Log the check-in
      try {
        await fetch('http://localhost:3000/checkin-log', {
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
        // Don't fail the check-in if logging fails
      }

      setStep(attendanceType === "normal" ? "success" : "emergency")
    } catch (error) {
      console.error('Network error:', error)
      toast({
        title: "Connection Error",
        description: "Cannot connect to server. Please ensure the backend is running on port 3000.",
        variant: "destructive",
      })
    }
    setLoading(false)
  }

  const handleEmergencyAttendance = async () => {
    setLoading(true)

    try {
      const response = await fetch(`http://localhost:3000/staff/by-mobile/${absentTeacherMobile}`)
      
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
            description: "Cannot connect to server. Please ensure the backend is running on port 3000.",
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
        const hallResponse = await fetch('http://localhost:3000/hall-plans')
        if (hallResponse.ok) {
          const hallData = await hallResponse.json()
          const assignment = hallData.find((h: any) => h.mobile_no === absent.mobile_no)
          setAbsentAssignment(assignment)
        }
      } catch (hallError) {
        console.error('Error fetching hall plans:', hallError)
        // Don't fail the check-in if hall plans can't be fetched
      }

      // Log the emergency check-in
      try {
        await fetch('http://localhost:3000/checkin-log', {
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
        // Don't fail the check-in if logging fails
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
        description: "Cannot connect to server. Please ensure the backend is running on port 3000.",
        variant: "destructive",
      })
      setLoading(false)
    }
  }

  if (step === "scan") {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-md mx-auto pt-20">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <QrCode className="w-8 h-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">Exam Invigilation Check-in</CardTitle>
            <CardDescription>
              {examSession?.exam_name} - {examSession?.time_slot}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              {/* Updated: Static QR Image */}
              <div className="w-48 h-48 mx-auto mb-4">
                <img
                  src="/qr.png"
                  alt="QR Code"
                  className="w-full h-full object-contain rounded-lg border border-gray-300"
                />
              </div>
              <Button onClick={handleQRScan} className="w-full" size="lg">
                Simulate QR Scan
              </Button>
            </div>

            {!isScannerSimulated && (
              <div className="pt-4 border-t">
                <Button
                  variant="outline"
                  className="w-full justify-start bg-transparent mt-2"
                  onClick={() => {
                    setAttendanceType("proxy")
                    setStep("verify")
                  }}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Collecting for Colleague
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


  if (step === "verify") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-md mx-auto pt-20">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5" />
                {attendanceType === "normal" ? "Verify Identity" : "Emergency Check-in"}
              </CardTitle>
              <CardDescription>
                {attendanceType === "normal"
                  ? "Enter your mobile number to verify your identity"
                  : "You are collecting papers for a colleague"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {attendanceType !== "normal" && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Emergency attendance procedure activated. Additional verification required.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="mobile">Your Mobile Number</Label>
                <Input
                  id="mobile"
                  type="tel"
                  placeholder="Enter 10-digit mobile number"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  maxLength={10}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="attendance-type">Attendance Type</Label>
                {isScannerSimulated ? (
                  <Input id="attendance-type" value="Normal Check-in" disabled />
                ) : (
                  <Select value={attendanceType} onValueChange={(value: any) => setAttendanceType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal Check-in</SelectItem>
                      <SelectItem value="proxy">Collecting for Colleague</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>

              <Button
                onClick={handleMobileVerification}
                className="w-full"
                disabled={mobileNumber.length !== 10 || loading}
              >
                {loading ? "Verifying..." : "Verify & Continue"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (step === "emergency") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-md mx-auto pt-20">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                Emergency Attendance
              </CardTitle>
              <CardDescription>
                {attendanceType === "remote"
                  ? "Remote attendance verification for absent colleague"
                  : "Proxy collection for absent colleague"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium">Verified Staff Member:</p>
                <p className="text-lg">{currentTeacher?.name}</p>
                <p className="text-sm text-gray-600">{currentTeacher?.department}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="absent-mobile">Absent Teacher's Mobile</Label>
                <Input
                  id="absent-mobile"
                  type="tel"
                  placeholder="Enter absent teacher's mobile"
                  value={absentTeacherMobile}
                  onChange={(e) => setAbsentTeacherMobile(e.target.value)}
                  maxLength={10}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Emergency Reason</Label>
                <Select value={emergencyReason} onValueChange={setEmergencyReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="medical">Medical Emergency</SelectItem>
                    <SelectItem value="family">Family Emergency</SelectItem>
                    <SelectItem value="transport">Transport Issues</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {attendanceType === "remote" && (
                <div className="space-y-2">
                  <Label htmlFor="otp">OTP (sent to absent teacher)</Label>
                  <Input
                    id="otp"
                    type="text"
                    placeholder="Enter 6-digit OTP"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    maxLength={6}
                  />
                </div>
              )}

              <Button
                onClick={handleEmergencyAttendance}
                className="w-full"
                disabled={!absentTeacherMobile || !emergencyReason || loading}
              >
                {loading ? "Processing..." : "Confirm Emergency Attendance"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (step === "success") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-md mx-auto pt-20">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl">Check-in Successful!</CardTitle>
              <CardDescription>
                {attendanceType !== "normal" && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Emergency attendance procedure completed successfully.
                    </AlertDescription>
                  </Alert>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold mb-2">Your Assignment</h3>
                <div className="space-y-1 text-sm">
                  <p>
                    <strong>Teacher:</strong> {currentTeacher?.name}
                  </p>
                  <p>
                    <strong>Hall:</strong> {currentAssignment?.hall_no}
                  </p>
                  <p>
                    <strong>Department:</strong> {currentAssignment?.dept_name}
                  </p>
                  <p>
                    <strong>Date:</strong> {currentAssignment?.assignment_date}
                  </p>
                  <Badge variant="secondary" className="mt-2">
                    {attendanceType === "normal"
                      ? "Normal"
                      : attendanceType === "proxy"
                        ? "Proxy Collection"
                        : "Emergency Staff"}
                  </Badge>
                </div>
              </div>

              {attendanceType !== "normal" && absentTeacher && (
                <div className="p-4 bg-orange-50 rounded-lg">
                  <h3 className="font-semibold mb-2">Absent Teacher Details</h3>
                  <div className="space-y-1 text-sm">
                    <p>
                      <strong>Name:</strong> {absentTeacher?.name}
                    </p>
                    <p>
                      <strong>Department:</strong> {absentTeacher?.department}
                    </p>
                    <p>
                      <strong>Hall:</strong> {absentAssignment?.hall_no}
                    </p>
                  </div>
                </div>
              )}

              <Button
                onClick={() => {
                  setStep("scan")
                  setMobileNumber("")
                  setCurrentTeacher(null)
                  setAbsentTeacher(null)
                  setCurrentAssignment(null)
                  setAbsentAssignment(null)
                  setIsScannerSimulated(false)
                }}
                className="w-full"
              >
                Check-in Another Staff
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return null
}
