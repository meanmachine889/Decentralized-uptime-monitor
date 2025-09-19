"use client";

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Clock } from 'lucide-react';
import { Ticks, UseWebsites } from '@/hook/useWebsites';
import AddWebsite from '@/components/AddWebsiteModal';
import AddWebsiteModal from '@/components/AddWebsiteModal';

interface AggregatedTick {
  timestamp: string;
  status: 'Good' | 'Bad';
  avgLatency: number;
  tickCount: number;
}

function App() {
  const { websites, RefreshWebsite } = UseWebsites();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const toggleExpanded = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Aggregate ticks into 3-minute windows
  const aggregateTicks = (ticks: Ticks[]): AggregatedTick[] => {
    const windows: { [key: string]: any[] } = {};
    const windowSize = 3 * 60 * 1000; // 3 minutes in milliseconds

    ticks.forEach(tick => {
      const tickTime = new Date(tick.createdAt).getTime();
      const windowStart = Math.floor(tickTime / windowSize) * windowSize;
      const windowKey = windowStart.toString();

      if (!windows[windowKey]) {
        windows[windowKey] = [];
      }
      windows[windowKey].push(tick);
    });

    // Get last 10 windows (30 minutes)
    const sortedWindows = Object.keys(windows)
      .sort((a, b) => parseInt(b) - parseInt(a))
      .slice(0, 10)
      .reverse();

    return sortedWindows.map(windowKey => {
      const windowTicks = windows[windowKey];
      const upTicks = windowTicks.filter(t => t.status === 'Good');
      const avgLatency = windowTicks.reduce((sum, t) => sum + t.latency, 0) / windowTicks.length;

      return {
        timestamp: new Date(parseInt(windowKey)).toISOString(),
        status: upTicks.length > windowTicks.length / 2 ? 'Good' : 'Bad',
        avgLatency: Math.round(avgLatency),
        tickCount: windowTicks.length
      };
    });
  };

  const calculateUptime = (ticks: any[]): number => {
    if (ticks.length === 0) return 0;
    const upTicks = ticks.filter(t => t.status === 'Good').length;
    return Math.round((upTicks / ticks.length) * 100 * 10) / 10;
  };

  const getLatestStatus = (ticks: any[]): 'Good' | 'Bad' | 'unknown' => {
    if (ticks.length === 0) return 'unknown';
    const latest = ticks.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
    return latest.status === 'Good' ? 'Good' : 'Bad';
  };

  const getAverageLatency = (ticks: any[]): number => {
    const upTicks = ticks.filter(t => t.status === 'Good');
    if (upTicks.length === 0) return 0;
    return Math.round(upTicks.reduce((sum, t) => sum + t.latency, 0) / upTicks.length);
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const overallStatus = websites.length > 0 && websites.every(site =>
    getLatestStatus(site.ticks) === 'Good'
  ) ? 'Good' : 'Bad';

  return (
    <div className="min-h-screen bg-black text-white ">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className={`w-4 h-4 rounded-full ${overallStatus === 'Good' ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <h1 className="text-2xl  tracking-wide">System Status</h1>
            </div>

            <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2 border border-gray-700 rounded-lg hover:bg-gray-900/30 transition-colors text-sm">
              <Plus className="w-4 h-4" />
              Add Website
            </button>
          </div>

          <p className="text-gray-400 text-sm">
            {websites.length === 0
              ? 'No websites configured'
              : overallStatus === 'Good'
                ? 'All systems operational'
                : 'Some systems experiencing issues'
            }
          </p>
        </div>

        {/* Websites List */}
        {websites.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">No websites to monitor</div>
            <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-6 py-3 border border-gray-700 rounded-lg hover:bg-gray-900/30 transition-colors text-sm mx-auto">
              <Plus className="w-4 h-4" />
              Add your first website
            </button>
          </div>
        ) : (
          <div className="space-y-1">
            {websites.map((website) => {
              const aggregatedTicks = aggregateTicks(website.ticks);
              const uptime = calculateUptime(website.ticks);
              const status = getLatestStatus(website.ticks);
              const avgLatency = getAverageLatency(website.ticks);

              return (
                <div key={website.id} className="border border-gray-800 rounded-lg overflow-hidden">
                  {/* Website Header */}
                  <button
                    onClick={() => toggleExpanded(website.id)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-900/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${status === 'Good' ? 'bg-green-500' : status === 'unknown' ? 'bg-gray-400' : 'bg-red-500'}`}></div>
                      <div className="text-left">
                        <h3 className="font-normal text-white">{website.url}</h3>
                        <p className="text-xs text-gray-400 mt-1">
                          {website.ticks.length} checks in last 30 minutes
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm text-gray-300">{uptime}% uptime</p>
                        <p className="text-xs text-gray-500">
                          {status === 'Good' ? `${avgLatency}ms avg` : 'Offline'}
                        </p>
                      </div>

                      {/* Uptime Indicators */}
                      <div className="flex gap-1">
                        {aggregatedTicks.map((tick, index) => (
                          <div
                            key={index}
                            className={`w-2 h-6 rounded-sm ${tick.status === 'Good' ? 'bg-green-500' : 'bg-red-500'
                              }`}
                            title={`${formatTime(tick.timestamp)} - ${tick.status} (${tick.tickCount} checks, ${tick.avgLatency}ms avg)`}
                          ></div>
                        ))}
                      </div>

                      {expandedId === website.id ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </button>

                  {/* Expanded Content */}
                  {expandedId === website.id && (
                    <div className="px-6 pb-6 border-t border-gray-800">
                      <div className="pt-4">
                        <h4 className="text-sm text-gray-300 mb-3 flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          Last 30 minutes (3-minute windows)
                        </h4>

                        <div className="grid grid-cols-10 gap-2 mb-4">
                          {aggregatedTicks.map((tick, index) => (
                            <div key={index} className="text-center">
                              <div
                                className={`w-full h-8 rounded ${tick.status === 'Good' ? 'bg-green-500' : 'bg-red-500'
                                  } mb-1`}
                                title={`${formatTime(tick.timestamp)} - ${tick.status} (${tick.tickCount} checks, ${tick.avgLatency}ms avg)`}
                              ></div>
                              <p className="text-xs text-gray-500">
                                {formatTime(tick.timestamp)}
                              </p>
                            </div>
                          ))}
                        </div>

                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-gray-400">Status</p>
                            <p className={`capitalize ${status === 'Good' ? 'text-green-400' : 'text-red-400'}`}>
                              {status}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-400">Avg Response Time</p>
                            <p className="text-white">
                              {status === 'Good' ? `${avgLatency}ms` : 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-400">Uptime</p>
                            <p className="text-white">{uptime}%</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-gray-800 text-center">
          <p className="text-gray-500 text-sm">
            Updated every minute • Last check: {new Date().toLocaleTimeString()}
          </p>
        </div>
      </div>
      {showAddModal && <AddWebsiteModal setShowAddModal={setShowAddModal} RefreshWebsite={RefreshWebsite} />}
    </div>
  );
}

export default App;