/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  HeartPulse, 
  Wrench, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Calendar, 
  Plus, 
  Search, 
  Filter, 
  History, 
  Sparkles, 
  RotateCcw, 
  Check, 
  X, 
  ChevronRight, 
  ShieldCheck, 
  Layers, 
  DollarSign, 
  Info,
  Sliders,
  Cpu
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { HAEntity, Room, MaintenanceTask, MaintenanceLogEntry, MaintenanceStatus, MaintenanceCategory } from '../types';

interface DeviceHealthViewProps {
  tasks: MaintenanceTask[];
  logs: MaintenanceLogEntry[];
  entities: HAEntity[];
  rooms: Room[];
  darkMode: boolean;
  onCompleteTask: (taskId: string, logData: { servicedBy: string; notes: string; cost?: number; replacedPart?: string }) => void;
  onAddTask: (newTask: Omit<MaintenanceTask, 'id' | 'status'>) => void;
  onSelectDevice?: (entityId: string) => void;
}

export default function DeviceHealthView({
  tasks,
  logs,
  entities,
  rooms,
  darkMode,
  onCompleteTask,
  onAddTask,
  onSelectDevice
}: DeviceHealthViewProps) {
  const [activeTab, setActiveTab] = useState<'tasks' | 'due' | 'history'>('tasks');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCompleteModal, setShowCompleteModal] = useState<MaintenanceTask | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Complete modal state
  const [servicedBy, setServicedBy] = useState('Sarah Jenkins');
  const [serviceNotes, setServiceNotes] = useState('');
  const [serviceCost, setServiceCost] = useState('');
  const [replacedPart, setReplacedPart] = useState('');

  // Add modal state
  const [newEntityId, setNewEntityId] = useState(entities[0]?.entity_id || '');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newCategory, setNewCategory] = useState<MaintenanceCategory>('filter');
  const [newIntervalDays, setNewIntervalDays] = useState(60);
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [newInstructions, setNewInstructions] = useState('');
  const [newEstimatedCost, setNewEstimatedCost] = useState('');

  // Derived metrics
  const overdueCount = tasks.filter(t => t.status === 'overdue').length;
  const dueSoonCount = tasks.filter(t => t.status === 'due_soon').length;
  const healthyCount = tasks.filter(t => t.status === 'healthy').length;
  const totalTasks = tasks.length;
  
  // Overall Health Score: 100 - (overdue * 18 + dueSoon * 6)
  const healthScore = Math.max(10, Math.min(100, Math.round(100 - (overdueCount * 18 + dueSoonCount * 7))));

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    const matchesTab = activeTab === 'due' ? (task.status === 'overdue' || task.status === 'due_soon') : true;
    const matchesCategory = selectedCategory === 'all' || task.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      task.taskTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.deviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.roomName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesCategory && matchesSearch;
  });

  const filteredLogs = logs.filter(log => {
    return searchQuery === '' || 
      log.taskTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.deviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.servicedBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.notes && log.notes.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  const handleOpenCompleteModal = (task: MaintenanceTask) => {
    setShowCompleteModal(task);
    setServicedBy('Sarah Jenkins');
    setServiceNotes(`Maintenance service performed: ${task.taskTitle}`);
    setServiceCost(task.estimatedCost ? task.estimatedCost.toString() : '');
    setReplacedPart(task.partNumber || '');
  };

  const handleConfirmComplete = () => {
    if (!showCompleteModal) return;
    onCompleteTask(showCompleteModal.id, {
      servicedBy: servicedBy.trim() || 'Resident',
      notes: serviceNotes.trim(),
      cost: serviceCost ? parseFloat(serviceCost) : undefined,
      replacedPart: replacedPart.trim() || undefined
    });
    setShowCompleteModal(null);
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    const ent = entities.find(e => e.entity_id === newEntityId);
    if (!ent || !newTaskTitle.trim()) return;

    const today = new Date();
    const dueDate = new Date();
    dueDate.setDate(today.getDate() + newIntervalDays);

    onAddTask({
      entityId: ent.entity_id,
      deviceName: ent.attributes.friendly_name || ent.entity_id,
      roomName: ent.attributes.room || 'General',
      taskTitle: newTaskTitle.trim(),
      category: newCategory,
      intervalDays: newIntervalDays,
      lastServicedDate: today.toISOString().split('T')[0],
      dueDate: dueDate.toISOString().split('T')[0],
      priority: newPriority,
      wearPercentage: 10,
      instructions: newInstructions.trim() || undefined,
      estimatedCost: newEstimatedCost ? parseFloat(newEstimatedCost) : undefined
    });

    setShowAddModal(false);
    setNewTaskTitle('');
    setNewInstructions('');
    setNewEstimatedCost('');
  };

  const getStatusBadge = (status: MaintenanceStatus) => {
    switch (status) {
      case 'overdue':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <AlertTriangle size={11} />
            Overdue
          </span>
        );
      case 'due_soon':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Clock size={11} />
            Due Soon
          </span>
        );
      case 'healthy':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 size={11} />
            Healthy
          </span>
        );
    }
  };

  const getCategoryIcon = (category: MaintenanceCategory) => {
    switch (category) {
      case 'filter':
        return <Layers size={14} className="text-sky-400" />;
      case 'cleaning':
        return <Sparkles size={14} className="text-amber-400" />;
      case 'battery':
        return <Cpu size={14} className="text-emerald-400" />;
      case 'calibration':
        return <Sliders size={14} className="text-purple-400" />;
      case 'inspection':
        return <ShieldCheck size={14} className="text-indigo-400" />;
      case 'firmware':
      default:
        return <Wrench size={14} className="text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6" id="device-health-view-root">
      {/* Top Fleet Health Banner Card */}
      <div className={`p-6 sm:p-7 rounded-[32px] border shadow-sm backdrop-blur-xl transition-all relative overflow-hidden ${
        darkMode ? 'bg-slate-900/80 border-slate-800 text-white' : 'bg-white/85 border-slate-100 text-slate-800'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          {/* Left: Overall Health Score & Intro */}
          <div className="flex items-start sm:items-center gap-5">
            <div className="relative shrink-0">
              {/* Circular Health Meter */}
              <div className={`w-20 h-20 rounded-3xl flex flex-col items-center justify-center border-2 shadow-lg ${
                healthScore >= 80 
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-emerald-500/10' 
                  : healthScore >= 60 
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-400 shadow-amber-500/10' 
                    : 'bg-rose-500/10 border-rose-500/40 text-rose-400 shadow-rose-500/10'
              }`}>
                <HeartPulse size={22} className="mb-0.5 animate-pulse" />
                <span className="text-xl font-black font-mono leading-none">{healthScore}%</span>
                <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 mt-0.5">Health</span>
              </div>
            </div>

            <div>
              <span className={`text-[10px] font-black uppercase tracking-widest block mb-1 ${
                darkMode ? 'text-[#9D8BFF]' : 'text-indigo-600'
              }`}>PREDICTIVE SMART DIAGNOSTICS</span>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
                Device Fleet Health & Maintenance Hub
              </h2>
              <p className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Continuous lifecycle telemetry, preventive filter replacements, sensor calibration, and verified service history.
              </p>
            </div>
          </div>

          {/* Right: Quick Action Counters & Schedule Button */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Quick Stat Pill: Overdue */}
            <div className={`px-4 py-2.5 rounded-2xl border text-center ${
              overdueCount > 0 
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' 
                : darkMode ? 'bg-slate-950/40 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}>
              <p className="text-lg font-black font-mono leading-none">{overdueCount}</p>
              <p className="text-[9px] font-bold uppercase tracking-wider mt-0.5">Overdue</p>
            </div>

            {/* Quick Stat Pill: Due Soon */}
            <div className={`px-4 py-2.5 rounded-2xl border text-center ${
              dueSoonCount > 0 
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' 
                : darkMode ? 'bg-slate-950/40 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}>
              <p className="text-lg font-black font-mono leading-none">{dueSoonCount}</p>
              <p className="text-[9px] font-bold uppercase tracking-wider mt-0.5">Due Soon</p>
            </div>

            {/* Quick Stat Pill: Healthy */}
            <div className={`px-4 py-2.5 rounded-2xl border text-center ${
              darkMode ? 'bg-slate-950/40 border-slate-800 text-emerald-400' : 'bg-slate-50 border-slate-200 text-emerald-600'
            }`}>
              <p className="text-lg font-black font-mono leading-none">{healthyCount}</p>
              <p className="text-[9px] font-bold uppercase tracking-wider mt-0.5">Healthy</p>
            </div>

            {/* Add Custom Maintenance Task Button */}
            <button
              id="btn-schedule-new-task"
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-4 py-3 rounded-2xl bg-[#7B61FF] hover:bg-[#684be3] text-white text-xs font-black flex items-center gap-1.5 shadow-lg shadow-[#7B61FF]/30 transition-all cursor-pointer transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus size={16} />
              <span>Schedule Task</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Control Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Navigation Tabs */}
        <div className={`p-1.5 rounded-2xl border flex items-center gap-1 shadow-2xs backdrop-blur-md self-start ${
          darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-100/90 border-slate-200'
        }`}>
          <button
            id="tab-health-all-tasks"
            type="button"
            onClick={() => setActiveTab('tasks')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'tasks'
                ? 'bg-[#7B61FF] text-white shadow-md shadow-[#7B61FF]/30'
                : darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Wrench size={13} />
            <span>Active Schedules ({tasks.length})</span>
          </button>

          <button
            id="tab-health-due-tasks"
            type="button"
            onClick={() => setActiveTab('due')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'due'
                ? 'bg-[#7B61FF] text-white shadow-md shadow-[#7B61FF]/30'
                : darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <AlertTriangle size={13} className={overdueCount > 0 ? 'text-rose-400' : 'text-amber-400'} />
            <span>Attention Required ({overdueCount + dueSoonCount})</span>
          </button>

          <button
            id="tab-health-history"
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-[#7B61FF] text-white shadow-md shadow-[#7B61FF]/30'
                : darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History size={13} />
            <span>Service History ({logs.length})</span>
          </button>
        </div>

        {/* Search & Category Filter */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Search Box */}
          <div className="relative min-w-[200px] flex-1 sm:flex-initial">
            <input
              type="text"
              placeholder="Search tasks, devices, parts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full text-xs pl-8 pr-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#7B61FF] ${
                darkMode 
                  ? 'bg-slate-900/80 border-slate-800 text-white placeholder:text-slate-500' 
                  : 'bg-white border-slate-200 text-slate-800 placeholder:text-slate-400'
              }`}
            />
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Dropdown Filter */}
          {activeTab !== 'history' && (
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className={`text-xs px-3 py-2 rounded-xl border font-bold focus:outline-none focus:ring-2 focus:ring-[#7B61FF] cursor-pointer ${
                darkMode 
                  ? 'bg-slate-900 border-slate-800 text-slate-300' 
                  : 'bg-white border-slate-200 text-slate-700'
              }`}
            >
              <option value="all">All Categories</option>
              <option value="filter">Filters & Screens</option>
              <option value="cleaning">Cleaning & Descaling</option>
              <option value="battery">Battery & Contacts</option>
              <option value="calibration">Calibration & Lube</option>
              <option value="inspection">Sensor Inspection</option>
            </select>
          )}
        </div>
      </div>

      {/* VIEW CONTENT */}
      {activeTab !== 'history' ? (
        /* Tasks List / Grid */
        <div>
          {filteredTasks.length === 0 ? (
            <div className={`p-12 rounded-3xl border text-center ${
              darkMode ? 'bg-slate-900/40 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
            }`}>
              <CheckCircle2 size={36} className="mx-auto mb-3 text-emerald-400" />
              <h3 className="font-extrabold text-base mb-1">No Maintenance Tasks Found</h3>
              <p className="text-xs max-w-md mx-auto">
                {searchQuery ? 'Try adjusting your search terms or filters.' : 'All registered smart home devices are operating in optimal health condition!'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTasks.map((task) => {
                const wear = task.wearPercentage || 30;
                return (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-5 rounded-[28px] border shadow-sm transition-all relative flex flex-col justify-between group ${
                      task.status === 'overdue'
                        ? darkMode ? 'bg-slate-900/90 border-rose-500/40 shadow-rose-950/20' : 'bg-rose-50/40 border-rose-200 shadow-rose-100/50'
                        : task.status === 'due_soon'
                          ? darkMode ? 'bg-slate-900/80 border-amber-500/40 shadow-amber-950/20' : 'bg-amber-50/30 border-amber-200 shadow-amber-100/50'
                          : darkMode ? 'bg-slate-900/70 border-white/10 hover:border-slate-700' : 'bg-white/85 border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <div>
                      {/* Top Header Row */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`p-2 rounded-xl border ${
                            darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
                          }`}>
                            {getCategoryIcon(task.category)}
                          </div>
                          <div>
                            <span className={`text-[9px] font-black uppercase block leading-none ${
                              darkMode ? 'text-[#9D8BFF]' : 'text-indigo-600'
                            }`}>
                              {task.roomName}
                            </span>
                            <p className="font-extrabold text-xs text-slate-400 mt-0.5 truncate max-w-[150px]">
                              {task.deviceName}
                            </p>
                          </div>
                        </div>

                        {getStatusBadge(task.status)}
                      </div>

                      {/* Task Title */}
                      <h3 className={`font-extrabold text-sm mb-2 leading-snug ${
                        darkMode ? 'text-white' : 'text-slate-900'
                      }`}>
                        {task.taskTitle}
                      </h3>

                      {/* Wear Level Progress Bar */}
                      <div className="space-y-1.5 mb-3">
                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                          <span>Wear / Utilization</span>
                          <span className={wear >= 90 ? 'text-rose-400 font-mono' : wear >= 70 ? 'text-amber-400 font-mono' : 'text-emerald-400 font-mono'}>
                            {wear}%
                          </span>
                        </div>
                        <div className={`w-full h-1.5 rounded-full overflow-hidden ${
                          darkMode ? 'bg-slate-800' : 'bg-slate-100'
                        }`}>
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              wear >= 90 ? 'bg-rose-500' : wear >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, wear)}%` }}
                          />
                        </div>
                      </div>

                      {/* Instructions / Notes snippet */}
                      {task.instructions && (
                        <p className={`text-[11px] leading-relaxed mb-3 line-clamp-2 p-2 rounded-xl ${
                          darkMode ? 'bg-slate-950/40 text-slate-300' : 'bg-slate-50 text-slate-600'
                        }`}>
                          {task.instructions}
                        </p>
                      )}

                      {/* Metadata Details */}
                      <div className={`text-[10px] font-semibold space-y-1 pt-2.5 border-t ${
                        darkMode ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-500'
                      }`}>
                        <div className="flex justify-between items-center">
                          <span>Scheduled Interval:</span>
                          <span className="font-mono">{task.intervalDays} days</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Last Serviced:</span>
                          <span className="font-mono">{task.lastServicedDate}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Target Due Date:</span>
                          <span className={`font-mono font-bold ${
                            task.status === 'overdue' ? 'text-rose-400' : task.status === 'due_soon' ? 'text-amber-400' : ''
                          }`}>{task.dueDate}</span>
                        </div>
                        {task.partNumber && (
                          <div className="flex justify-between items-center">
                            <span>OEM Part:</span>
                            <code className={`text-[9px] px-1 rounded ${darkMode ? 'bg-slate-950 text-[#9D8BFF]' : 'bg-slate-100 text-indigo-700'}`}>
                              {task.partNumber}
                            </code>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Button: Log Maintenance Done */}
                    <div className="mt-4 pt-3 border-t border-dashed border-slate-700/50">
                      <button
                        id={`btn-complete-task-${task.id}`}
                        type="button"
                        onClick={() => handleOpenCompleteModal(task)}
                        className={`w-full py-2.5 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          task.status === 'overdue'
                            ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-md shadow-rose-500/25'
                            : task.status === 'due_soon'
                              ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/25'
                              : darkMode
                                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700'
                        }`}
                      >
                        <Check size={14} />
                        <span>Log Service Completed</span>
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Maintenance Service History Timeline */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className={`text-sm font-extrabold tracking-tight ${darkMode ? 'text-white' : 'text-slate-800'}`}>
              Chronological Service Log History ({logs.length} Entries)
            </h3>
            <span className="text-[10px] text-slate-400 font-bold">Most recent entries first</span>
          </div>

          <div className="space-y-3">
            {filteredLogs.map((log, idx) => (
              <motion.div
                key={log.id || idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.04 }}
                className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  darkMode ? 'bg-slate-900/70 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800 shadow-2xs'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 border ${
                    darkMode ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                  }`}>
                    <CheckCircle2 size={18} />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-black uppercase ${
                        darkMode ? 'text-[#9D8BFF]' : 'text-indigo-600'
                      }`}>
                        {log.roomName} • {log.deviceName}
                      </span>
                      <span className="text-slate-400 text-xs">•</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Serviced on {log.servicedDate}
                      </span>
                    </div>

                    <h4 className="font-extrabold text-sm mt-0.5 text-slate-100 dark:text-white">
                      {log.taskTitle}
                    </h4>

                    {log.notes && (
                      <p className={`text-xs mt-1 leading-relaxed ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                        "{log.notes}"
                      </p>
                    )}

                    {log.replacedPart && (
                      <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                        <Wrench size={11} className="text-indigo-400" />
                        <span>Part Installed: <strong className="text-slate-200">{log.replacedPart}</strong></span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0 sm:self-center border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Verified by</span>
                  <span className="text-xs font-bold text-slate-300">{log.servicedBy}</span>
                  {typeof log.cost === 'number' && log.cost > 0 && (
                    <span className="block text-[10px] font-mono font-bold text-emerald-400 mt-0.5">
                      ${log.cost.toFixed(2)}
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: Log Service / Mark Task Completed */}
      <AnimatePresence>
        {showCompleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-lg p-6 rounded-3xl border shadow-2xl ${
                darkMode ? 'bg-[#0d1428] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-[10px] font-black uppercase text-[#7B61FF] tracking-wider">LOG MAINTENANCE EVENT</span>
                  <h3 className="text-lg font-black">{showCompleteModal.taskTitle}</h3>
                  <p className="text-xs text-slate-400">{showCompleteModal.deviceName} ({showCompleteModal.roomName})</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCompleteModal(null)}
                  className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="font-bold text-slate-400 block mb-1">Technician / Resident Name</label>
                  <input
                    type="text"
                    value={servicedBy}
                    onChange={(e) => setServicedBy(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#7B61FF] ${
                      darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-400 block mb-1">Service & Inspection Notes</label>
                  <textarea
                    rows={3}
                    value={serviceNotes}
                    onChange={(e) => setServiceNotes(e.target.value)}
                    placeholder="e.g. Vacuum filter replaced 2 weeks ago / cleaned debris / calibrated sensor..."
                    className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#7B61FF] ${
                      darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-400 block mb-1">Replaced Part (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. OEM HEPA Filter"
                      value={replacedPart}
                      onChange={(e) => setReplacedPart(e.target.value)}
                      className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#7B61FF] ${
                        darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-400 block mb-1">Cost in $ (Optional)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={serviceCost}
                      onChange={(e) => setServiceCost(e.target.value)}
                      className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#7B61FF] ${
                        darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                  </div>
                </div>

                <div className={`p-3 rounded-2xl border text-[11px] leading-relaxed flex items-center gap-2.5 ${
                  darkMode ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}>
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                  <span>
                    Marking complete will reset the {showCompleteModal.intervalDays}-day maintenance interval, compute the next due date, and log this record to the verified timeline.
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 mt-5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCompleteModal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  id="btn-confirm-log-service"
                  type="button"
                  onClick={handleConfirmComplete}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black shadow-md shadow-emerald-500/30 transition-all cursor-pointer"
                >
                  Confirm & Save Record
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Schedule New Maintenance Task */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-lg p-6 rounded-3xl border shadow-2xl ${
                darkMode ? 'bg-[#0d1428] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-[10px] font-black uppercase text-[#7B61FF] tracking-wider">NEW MAINTENANCE SCHEDULE</span>
                  <h3 className="text-lg font-black">Add Device Maintenance Task</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateTask} className="space-y-3.5 text-xs">
                <div>
                  <label className="font-bold text-slate-400 block mb-1">Target Smart Device</label>
                  <select
                    value={newEntityId}
                    onChange={(e) => setNewEntityId(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#7B61FF] ${
                      darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    {entities.map(e => (
                      <option key={e.entity_id} value={e.entity_id}>
                        {e.attributes.friendly_name} ({e.attributes.room || 'General'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-400 block mb-1">Task Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. UV Lamp Replacement, Air Filter Flush..."
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#7B61FF] ${
                      darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-400 block mb-1">Category</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as MaintenanceCategory)}
                      className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#7B61FF] ${
                        darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <option value="filter">Filter & Cartridge</option>
                      <option value="cleaning">Cleaning & Descaling</option>
                      <option value="battery">Battery & Contacts</option>
                      <option value="calibration">Calibration & Lube</option>
                      <option value="inspection">Sensor Inspection</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-400 block mb-1">Interval (Days)</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={730}
                      value={newIntervalDays}
                      onChange={(e) => setNewIntervalDays(parseInt(e.target.value) || 30)}
                      className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#7B61FF] ${
                        darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-400 block mb-1">Maintenance Instructions (Optional)</label>
                  <textarea
                    rows={2}
                    placeholder="Provide step-by-step guidance on how to service or replace..."
                    value={newInstructions}
                    onChange={(e) => setNewInstructions(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#7B61FF] ${
                      darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>

                <div className="flex justify-end gap-2.5 mt-5 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-[#7B61FF] hover:bg-[#684be3] text-white text-xs font-black shadow-md shadow-[#7B61FF]/30 transition-all cursor-pointer"
                  >
                    Add Task Schedule
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
