// admin/page.tsx
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Users, AlertTriangle, CheckCircle, Clock, Download, RefreshCw, Phone, UserCheck } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface CheckInLog {
  log_id: number
  staff_id: number
  checkin_time: string
  status: string
  qr_code_hash: string
  device_id: string
  ip_address: string
  location_lat: number | null
  location_lng: number | null
  remarks: string
}

interface StaffMember {
  staff_id: number
  name: string
  email: string
  mobile_no: string
  department: string
  designation: string
}

interface HallAssignment {
  assignment_id: number
  teacher_name: string
  mobile_no: string
  dept_name: string
  hall_no: string
  assignment_date: string
}

export default function AdminDashboard() {
  const [refreshing, setRefreshing] = useState(false)
  const [checkInLogs, setCheckInLogs] = useState<CheckInLog[]>([])
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([])
  const [hallAssignments, setHallAssignments] = useState<HallAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  // Fetch data from API
  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch check-in logs
      const logsResponse = await fetch('http://localhost:3000/checkin-logs/all')
      if (logsResponse.ok) {
        const logs = await logsResponse.json()
        setCheckInLogs(logs)
      }

      // Fetch staff members
      const staffResponse = await fetch('http://localhost:3000/staff/all')
      if (staffResponse.ok) {
        const staff = await staffResponse.json()
        setStaffMembers(staff)
      }

      // Fetch hall assignments
      const hallResponse = await fetch('http://localhost:3000/hall-plans')
      if (hallResponse.ok) {
        const halls = await hallResponse.json()
        setHallAssignments(halls)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      toast({
        title: "Error",
        description: "Failed to fetch data from server",
        variant: "destructive",
      })
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }

  const handleExport = () => {
    const data = {
      checkInLogs,
      staffMembers,
      hallAssignments,
      exportDate: new Date().toISOString()
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `attendance-report-${new Date().toISOString().split('T')[0]}.json`
    a.click()
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "present":
        return <Badge className="bg-green-100 text-green-800">Present</Badge>
      case "absent":
        return <Badge className="bg-orange-100 text-orange-800">Absent</Badge>
      case "late":
        return <Badge className="bg-blue-100 text-blue-800">Late</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getStaffName = (staffId: number) => {
    const staff = staffMembers.find(s => s.staff_id === staffId)
    return staff?.name || `Staff ID: ${staffId}`
  }

  const getStaffDept = (staffId: number) => {
    const staff = staffMembers.find(s => s.staff_id === staffId)
    return staff?.department || 'Unknown'
  }

  const getHallAssignment = (staffId: number) => {
    const staff = staffMembers.find(s => s.staff_id === staffId)
    if (!staff) return 'Unknown'
    
    const assignment = hallAssignments.find(h => h.mobile_no === staff.mobile_no)
    return assignment?.hall_no || 'Not Assigned'
  }

  const stats = {
    totalTeachers: staffMembers.length,
    present: checkInLogs.filter((c) => c.status === "present").length,
    absent: checkInLogs.filter((c) => c.status === "absent").length,
    late: checkInLogs.filter((c) => c.status === "late").length,
    totalCheckIns: checkInLogs.length,
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading dashboard data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Invigilation Admin Dashboard</h1>
            <p className="text-gray-600">Real-time attendance tracking and management</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleRefresh} variant="outline" disabled={refreshing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Teachers</p>
                  <p className="text-2xl font-bold">{stats.totalTeachers}</p>
                </div>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Present</p>
                  <p className="text-2xl font-bold text-green-600">{stats.present}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Absent</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.absent}</p>
                </div>
                <UserCheck className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Late</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.late}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Check-ins</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.totalCheckIns}</p>
                </div>
                <Phone className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Emergency Alerts */}
        {stats.absent > 0 && (
          <Alert className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {stats.absent} absent case(s) recorded. Review required.
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="attendance" className="space-y-4">
          <TabsList>
            <TabsTrigger value="attendance">Real-time Attendance</TabsTrigger>
            <TabsTrigger value="emergency">Emergency Logs</TabsTrigger>
            <TabsTrigger value="papers">Paper Collection</TabsTrigger>
          </TabsList>

          <TabsContent value="attendance">
            <Card>
              <CardHeader>
                <CardTitle>Teacher Attendance Status</CardTitle>
                <CardDescription>Real-time attendance tracking with emergency handling</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Teacher</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Hall</TableHead>
                      <TableHead>Check-in Time</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Device</TableHead>
                      <TableHead>Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {checkInLogs.map((checkIn) => (
                      <TableRow key={checkIn.log_id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{getStaffName(checkIn.staff_id)}</p>
                            <p className="text-sm text-gray-500">ID: {checkIn.staff_id}</p>
                          </div>
                        </TableCell>
                        <TableCell>{getStaffDept(checkIn.staff_id)}</TableCell>
                        <TableCell>{getHallAssignment(checkIn.staff_id)}</TableCell>
                        <TableCell>{new Date(checkIn.checkin_time).toLocaleString()}</TableCell>
                        <TableCell>{getStatusBadge(checkIn.status)}</TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600">{checkIn.device_id}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600 max-w-xs truncate block">
                            {checkIn.remarks}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="emergency">
            <Card>
              <CardHeader>
                <CardTitle>Emergency Attendance Logs</CardTitle>
                <CardDescription>Detailed logs of all emergency attendance cases</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Log ID</TableHead>
                      <TableHead>Staff Member</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Device</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {checkInLogs
                      .filter(log => log.status === "absent" || log.status === "late")
                      .map((log) => (
                      <TableRow key={log.log_id}>
                        <TableCell className="font-mono">{log.log_id}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{getStaffName(log.staff_id)}</p>
                            <p className="text-sm text-gray-500">ID: {log.staff_id}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={log.status === "late" ? "default" : "secondary"}>
                            {log.status === "late" ? "Late" : "Absent"}
                          </Badge>
                        </TableCell>
                        <TableCell>{log.device_id}</TableCell>
                        <TableCell className="font-mono text-sm">{log.ip_address}</TableCell>
                        <TableCell>{new Date(log.checkin_time).toLocaleString()}</TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600 max-w-xs truncate block">
                            {log.remarks}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="papers">
            <Card>
              <CardHeader>
                <CardTitle>Paper Collection Tracking</CardTitle>
                <CardDescription>Monitor paper collection status across all halls</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {hallAssignments.map((assignment) => {
                    const checkIn = checkInLogs.find(c => {
                      const staff = staffMembers.find(s => s.staff_id === c.staff_id)
                      return staff?.mobile_no === assignment.mobile_no
                    })
                    
                    return (
                      <Card key={assignment.assignment_id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold">Hall {assignment.hall_no}</h3>
                            {checkIn ? (
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            ) : (
                              <Clock className="w-5 h-5 text-orange-500" />
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-1">Invigilator: {assignment.teacher_name}</p>
                          <p className="text-sm text-gray-600 mb-2">Department: {assignment.dept_name}</p>
                          {checkIn && getStatusBadge(checkIn.status)}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}