"use client"

import { useEffect, useState } from "react"
import { ChevronDown, ChevronRight, Plus, Clock, Delete, DeleteIcon, Trash, TicketSlash } from "lucide-react"
import { type Ticks, UseWebsites } from "@/hook/useWebsites"
import AddWebsiteModal from "@/components/AddWebsiteModal"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@clerk/nextjs"
import { API_BACKEND_URL } from "@/config"
import axios from "axios"
import { useRouter } from "next/navigation"

interface AggregatedTick {
  timestamp: string
  status: "Good" | "Bad"
  avgLatency: number
  tickCount: number
}

function App() {
  const { websites, RefreshWebsite } = UseWebsites()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const { getToken } = useAuth();
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      const router = useRouter();
      router.push("/");
    }
  }, [])

  const toggleExpanded = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  // Aggregate ticks into 3-minute windows
  const aggregateTicks = (ticks: Ticks[]): AggregatedTick[] => {
    const windows: { [key: string]: any[] } = {}
    const windowSize = 3 * 60 * 1000
    ticks.forEach((tick) => {
      const tickTime = new Date(tick.createdAt).getTime()
      const windowStart = Math.floor(tickTime / windowSize) * windowSize
      const windowKey = windowStart.toString()

      if (!windows[windowKey]) {
        windows[windowKey] = []
      }
      windows[windowKey].push(tick)
    })

    // Get last 10 windows (30 minutes)
    const sortedWindows = Object.keys(windows)
      .sort((a, b) => Number.parseInt(b) - Number.parseInt(a))
      .slice(0, 10)
      .reverse()

    return sortedWindows.map((windowKey) => {
      const windowTicks = windows[windowKey]
      const upTicks = windowTicks.filter((t) => t.status === "Good")
      const avgLatency = windowTicks.reduce((sum, t) => sum + t.latency, 0) / windowTicks.length

      return {
        timestamp: new Date(Number.parseInt(windowKey)).toISOString(),
        status: upTicks.length > windowTicks.length / 2 ? "Good" : "Bad",
        avgLatency: Math.round(avgLatency),
        tickCount: windowTicks.length,
      }
    })
  }

  const calculateUptime = (ticks: any[]): number => {
    if (ticks.length === 0) return 0
    const upTicks = ticks.filter((t) => t.status === "Good").length
    return Math.round((upTicks / ticks.length) * 100 * 10) / 10
  }

  const getLatestStatus = (ticks: any[]): "Good" | "Bad" | "unknown" => {
    if (ticks.length === 0) return "unknown"
    const latest = ticks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
    return latest.status === "Good" ? "Good" : "Bad"
  }

  const getAverageLatency = (ticks: any[]): number => {
    const upTicks = ticks.filter((t) => t.status === "Good")
    if (upTicks.length === 0) return 0
    return Math.round(upTicks.reduce((sum, t) => sum + t.latency, 0) / upTicks.length)
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const handleDeleteWebsite = async (websiteId: string) => {
    try {
      setDeleting(true);
      const token = await getToken();
      if (!token) {
        console.log("Unauthorized");
        return;
      }

      await axios.delete(`${API_BACKEND_URL}/api/v1/websites`, {
        data: { websiteId },
        headers: {
          Authorization: token,
        },
      });

      RefreshWebsite();
    } catch (error) {
      console.log("error deleting website", error);
    } finally {
      setDeleting(false);
    }
  };



  const overallStatus =
    websites.length > 0 && websites.every((site) => getLatestStatus(site.ticks) === "Good") ? "Good" : "Bad"

  return (
    <div className="min-h-screen bg-background text-foreground" style={{ fontFamily: 'var(--font-geist-mono)' }} >
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl tracking-wide font-normal">System Status</h1>
              <Badge variant="outline" className="ml-2 font-normal">
                {overallStatus === "Good" ? "Operational" : "Issues detected"}
              </Badge>
            </div>

            <Button variant="outline" size="sm" onClick={() => setShowAddModal(true)} className="font-normal">
              <Plus className="w-4 h-4 mr-2" />
              Add Website
            </Button>
          </div>

          <p className="text-muted-foreground text-sm">
            {websites.length === 0
              ? "No websites configured"
              : overallStatus === "Good"
                ? "All systems operational"
                : "Some systems experiencing issues"}
          </p>
        </div>

        {websites.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-muted-foreground mb-4">No websites to monitor</div>
            <Button variant="outline" onClick={() => setShowAddModal(true)} className="font-normal">
              <Plus className="w-4 h-4 mr-2" />
              Add your first website
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {websites.map((website) => {
              const filteredTicks = website.ticks.filter(tick => {
                const now = Date.now();
                const tickTime = new Date(tick.createdAt).getTime();
                return now - tickTime <= 30 * 60 * 1000;
              })
              const aggregatedTicks = aggregateTicks(filteredTicks)
              const uptime = calculateUptime(filteredTicks)
              const status = getLatestStatus(filteredTicks)
              const avgLatency = getAverageLatency(filteredTicks)

              return (
                <Card key={website.id} style={{ fontFamily: 'var(--font-geist-mono)' }} className="rounded-lg  bg-background border-2 shadow-none">
                  <button onClick={() => toggleExpanded(website.id)} className="w-full text-left">
                    <CardContent className="px-6 flex items-center justify-between transition-colors">
                      <div className="flex items-center gap-4">
                        <span
                          aria-hidden
                          className={`inline-block size-2 rounded-full ${status === "Good" ? "bg-green-500" : status === "Bad" ? "bg-red-500" : "bg-foreground/70"}`}
                        />
                        <div>
                          <h3 className="font-normal">{website.url}</h3>
                          <p className="text-xs text-muted-foreground mt-1">Status over the last 30 minutes</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <Button disabled={deleting} onClick={() => handleDeleteWebsite(website.id)} className="w-fit bg-red-500"><Trash /></Button>
                        <div className="text-right">
                          <p className="text-sm">{uptime}% uptime</p>
                          <p className="text-xs text-muted-foreground">
                            {status === "Good" ? `${avgLatency}ms avg` : "Offline"}
                          </p>
                        </div>

                        <div className="flex gap-1" aria-label="Uptime indicators">
                          {aggregatedTicks.filter(tick => {
                            const now = Date.now();
                            const tickTime = new Date(tick.timestamp).getTime();
                            return now - tickTime <= 30 * 60 * 1000;
                          }).map((tick, index) => (
                            <div
                              key={index}
                              className={`w-2 h-5 rounded-xs ${tick.status === "Good" ? "bg-green-500" : "bg-red-500"}`}
                              title={`${formatTime(tick.timestamp)} - ${tick.status} (${tick.tickCount} checks, ${tick.avgLatency}ms avg)`}
                            />
                          ))}
                        </div>

                        {expandedId === website.id ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </CardContent>
                  </button>

                  {
                    expandedId === website.id && (
                      <>
                        <Separator />
                        <div className="px-6 pb-6">
                          <div className="">
                            <h4 className="text-sm mb-3 flex items-center gap-2 font-normal">
                              <Clock className="w-4 h-4" />
                              Last 30 minutes (3-minute windows)
                            </h4>

                            <div className="grid grid-cols-10 gap-2 mb-7">
                              {aggregatedTicks.filter(tick => {
                                const now = Date.now();
                                const tickTime = new Date(tick.timestamp).getTime();
                                return now - tickTime <= 30 * 60 * 1000;
                              }).map((tick, index) => (
                                <div key={index} className="text-center">
                                  <div
                                    className={`w-full h-4 rounded-xs ${tick.status === "Good" ? "bg-green-500" : "bg-red-500"} mb-1`}
                                    title={`${formatTime(tick.timestamp)} - ${tick.status} (${tick.tickCount} checks, ${tick.avgLatency}ms avg)`}
                                  />
                                  <p className="text-xs text-muted-foreground">{formatTime(tick.timestamp)}</p>
                                </div>
                              ))}
                            </div>

                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Status</p>
                                <p className={`font-normal capitalize ${status == "Good" ? "text-green-500" : "text-red-500"}`}>{status}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Avg Response Time</p>
                                <p className="font-normal">{status === "Good" ? `${avgLatency}ms` : "N/A"}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Uptime</p>
                                <p className="font-normal">{uptime}%</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    )
                  }
                </Card>
              )
            })}
          </div>
        )}

        {/* Footer */}
        <div className="mt-12">
          <Separator className="mb-4" />
          <p className="text-muted-foreground text-sm text-center">
            Updated every minute • Last check: {new Date().toLocaleTimeString()}
          </p>
        </div>
      </div>
      {showAddModal && <AddWebsiteModal setShowAddModal={setShowAddModal} RefreshWebsite={RefreshWebsite} />}
    </div >
  )
}

export default App
