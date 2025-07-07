import React, { useState } from 'react';
import { Target, TrendingUp, Clock, Users, Zap, CheckCircle, Plus, X, ChevronDown, ChevronUp } from 'lucide-react';

interface Goal {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  unit: string;
  category: 'energy' | 'technical' | 'crowd' | 'time';
  priority: 'high' | 'medium' | 'low';
  deadline?: string;
  completed: boolean;
}

export const GoalSetter: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [goals, setGoals] = useState<Goal[]>([
    {
      id: '1',
      title: 'Peak Energy Mastery',
      description: 'Maintain high energy levels throughout the set',
      target: 85,
      current: 78,
      unit: '%',
      category: 'energy',
      priority: 'high',
      deadline: 'This Set',
      completed: false
    },
    {
      id: '2',
      title: 'Seamless Transitions',
      description: 'Achieve smooth, professional transitions',
      target: 95,
      current: 92,
      unit: '%',
      category: 'technical',
      priority: 'high',
      deadline: 'This Set',
      completed: false
    },
    {
      id: '3',
      title: 'Crowd Engagement',
      description: 'Keep the crowd dancing and engaged',
      target: 90,
      current: 85,
      unit: '%',
      category: 'crowd',
      priority: 'medium',
      deadline: 'Tonight',
      completed: false
    }
  ]);

  const activeGoals = goals.filter(g => !g.completed);
  const completedGoals = goals.filter(g => g.completed);
  const primaryGoal = activeGoals.find(g => g.priority === 'high');

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'energy': return <Zap className="text-yellow-400" size={14} />;
      case 'technical': return <Target className="text-purple-400" size={14} />;
      case 'crowd': return <Users className="text-cyan-400" size={14} />;
      case 'time': return <Clock className="text-green-400" size={14} />;
      default: return <Target className="text-gray-400" size={14} />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'energy': return 'border-yellow-500/30 bg-yellow-900/20';
      case 'technical': return 'border-purple-500/30 bg-purple-900/20';
      case 'crowd': return 'border-cyan-500/30 bg-cyan-900/20';
      case 'time': return 'border-green-500/30 bg-green-900/20';
      default: return 'border-gray-500/30 bg-gray-900/20';
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 90) return 'from-green-600 to-green-400';
    if (progress >= 70) return 'from-yellow-600 to-yellow-400';
    return 'from-red-600 to-red-400';
  };

  const completeGoal = (goalId: string) => {
    setGoals(prev => prev.map(goal => 
      goal.id === goalId ? { ...goal, completed: true } : goal
    ));
  };

  const deleteGoal = (goalId: string) => {
    setGoals(prev => prev.filter(goal => goal.id !== goalId));
  };

  const addNewGoal = () => {
    const newGoal: Goal = {
      id: Date.now().toString(),
      title: 'New Performance Goal',
      description: 'Describe your goal here',
      target: 80,
      current: 0,
      unit: '%',
      category: 'energy',
      priority: 'medium',
      deadline: 'This Set',
      completed: false
    };
    setGoals(prev => [...prev, newGoal]);
    setShowAddGoal(false);
  };

  return (
    <div className="glass-panel rounded-xl overflow-hidden">
      {/* Collapsed Header */}
      <div 
        className="p-4 cursor-pointer hover:bg-gray-800/30 transition-all"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Target className="text-green-400" size={20} />
            <h4 className="text-md font-bold text-white">Goal Setter</h4>
          </div>
          <div className="flex items-center gap-3">
            {primaryGoal && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">{primaryGoal.title}:</span>
                <span className={`font-semibold text-sm ${
                  (primaryGoal.current / primaryGoal.target) * 100 >= 90 
                    ? 'text-green-400' 
                    : (primaryGoal.current / primaryGoal.target) * 100 >= 70 
                    ? 'text-yellow-400' 
                    : 'text-red-400'
                }`}>
                  {primaryGoal.current}/{primaryGoal.target}{primaryGoal.unit}
                </span>
              </div>
            )}
            {isExpanded ? (
              <ChevronUp className="text-gray-400" size={16} />
            ) : (
              <ChevronDown className="text-gray-400" size={16} />
            )}
          </div>
        </div>

        {/* Quick Summary (Always Visible) */}
        <div className="flex items-center gap-4 mt-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Active Goals:</span>
            <span className="font-semibold text-white">{activeGoals.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Completed:</span>
            <span className="font-semibold text-green-400">{completedGoals.length}</span>
          </div>
          {primaryGoal && (
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Focus:</span>
              <span className="font-semibold text-purple-400">{primaryGoal.deadline}</span>
            </div>
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 animate-fade-in-fast border-t border-gray-700/50">
          <div className="mt-4 space-y-4">
            
            {/* Primary Goal Spotlight */}
            {primaryGoal && (
              <div className="bg-gradient-to-r from-purple-900/30 to-green-900/30 border border-purple-500/30 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Target className="text-purple-400" size={16} />
                    <span className="text-sm font-bold text-purple-300">PRIMARY FOCUS</span>
                  </div>
                  <span className="text-xs text-gray-400 bg-gray-800/50 px-2 py-1 rounded">
                    {primaryGoal.deadline}
                  </span>
                </div>
                
                <h5 className="text-lg font-bold text-white mb-2">{primaryGoal.title}</h5>
                <p className="text-sm text-gray-300 mb-3">{primaryGoal.description}</p>
                
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Progress</span>
                  <span className="text-lg font-bold text-white">
                    {primaryGoal.current}/{primaryGoal.target}{primaryGoal.unit}
                  </span>
                </div>
                
                <div className="w-full bg-gray-700 rounded-full h-3 mb-3">
                  <div 
                    className={`bg-gradient-to-r ${getProgressColor((primaryGoal.current / primaryGoal.target) * 100)} h-3 rounded-full transition-all duration-500`}
                    style={{ width: `${Math.min((primaryGoal.current / primaryGoal.target) * 100, 100)}%` }}
                  ></div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => completeGoal(primaryGoal.id)}
                    className="flex-1 px-3 py-2 bg-green-600/20 border border-green-500/30 text-green-300 text-sm rounded-lg hover:bg-green-600/40 transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={14} />
                    Mark Complete
                  </button>
                  <button className="px-3 py-2 bg-purple-600/20 border border-purple-500/30 text-purple-300 text-sm rounded-lg hover:bg-purple-600/40 transition-all">
                    Adjust Target
                  </button>
                </div>
              </div>
            )}

            {/* All Goals List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="text-sm font-semibold text-gray-300">All Performance Goals</h5>
                <button
                  onClick={() => setShowAddGoal(true)}
                  className="p-1.5 bg-green-600/20 border border-green-500/30 text-green-300 rounded hover:bg-green-600/40 transition-all"
                  title="Add new goal"
                >
                  <Plus size={14} />
                </button>
              </div>

              {goals.map((goal) => (
                <div
                  key={goal.id}
                  className={`border rounded-lg p-3 transition-all ${
                    goal.completed 
                      ? 'border-green-500/30 bg-green-900/20 opacity-75' 
                      : getCategoryColor(goal.category)
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(goal.category)}
                      <span className={`text-sm font-semibold ${goal.completed ? 'text-green-300 line-through' : 'text-white'}`}>
                        {goal.title}
                      </span>
                      {goal.priority === 'high' && !goal.completed && (
                        <span className="text-xs bg-red-600/20 text-red-300 px-1.5 py-0.5 rounded">
                          HIGH
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {!goal.completed && (
                        <button
                          onClick={() => completeGoal(goal.id)}
                          className="p-1 text-gray-400 hover:text-green-400 transition-colors"
                          title="Mark complete"
                        >
                          <CheckCircle size={12} />
                        </button>
                      )}
                      <button
                        onClick={() => deleteGoal(goal.id)}
                        className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                        title="Delete goal"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                  
                  <p className="text-xs text-gray-400 mb-2">{goal.description}</p>
                  
                  {!goal.completed && (
                    <>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-400">Progress</span>
                        <span className="text-xs font-semibold text-white">
                          {goal.current}/{goal.target}{goal.unit}
                        </span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-1.5">
                        <div 
                          className={`bg-gradient-to-r ${getProgressColor((goal.current / goal.target) * 100)} h-1.5 rounded-full transition-all duration-300`}
                          style={{ width: `${Math.min((goal.current / goal.target) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </>
                  )}
                  
                  {goal.completed && (
                    <div className="flex items-center gap-2 mt-2">
                      <CheckCircle className="text-green-400" size={14} />
                      <span className="text-sm text-green-400 font-semibold">Goal Achieved!</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add New Goal */}
            {showAddGoal && (
              <div className="border border-dashed border-gray-600 rounded-lg p-4 bg-gray-800/30">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="text-sm font-semibold text-white">Create New Goal</h5>
                  <button
                    onClick={() => setShowAddGoal(false)}
                    className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Goal title..."
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <textarea
                    placeholder="Describe your goal..."
                    rows={2}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="Target value"
                      className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <select className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                      <option value="energy">Energy</option>
                      <option value="technical">Technical</option>
                      <option value="crowd">Crowd</option>
                      <option value="time">Time</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={addNewGoal}
                      className="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded-lg transition-all"
                    >
                      Create Goal
                    </button>
                    <button
                      onClick={() => setShowAddGoal(false)}
                      className="px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded-lg transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="pt-3 border-t border-gray-700">
              <h5 className="text-sm font-semibold text-gray-300 mb-3">Quick Actions</h5>
              <div className="grid grid-cols-2 gap-2">
                <button className="px-3 py-2 bg-purple-600/20 border border-purple-500/30 text-purple-300 text-sm rounded-lg hover:bg-purple-600/40 transition-all flex items-center justify-center gap-2">
                  <TrendingUp size={14} />
                  Set Energy Goal
                </button>
                <button className="px-3 py-2 bg-cyan-600/20 border border-cyan-500/30 text-cyan-300 text-sm rounded-lg hover:bg-cyan-600/40 transition-all flex items-center justify-center gap-2">
                  <Users size={14} />
                  Crowd Target
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};