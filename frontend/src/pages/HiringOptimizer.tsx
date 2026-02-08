/**
 * HiringOptimizer — AI-powered hiring decision tool for HR
 * 
 * Analyzes whether hiring a senior developer is more cost-effective than
 * keeping multiple junior developers based on productivity metrics, GitHub stats,
 * and project delivery performance.
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, TrendingUp, GitBranch, Code, DollarSign, 
  AlertCircle, CheckCircle, BarChart3, Zap, Target,
  ArrowRight, Info, Calculator
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { api } from '@/services/api';
import { toast } from 'sonner';

interface DeveloperMetrics {
  name: string;
  role: string;
  performance: number;
  tasksCompleted: number;
  avgTaskTime: number; // hours
  codeQuality: number; // 0-100
  salary: number;
}

interface HiringRecommendation {
  recommendation: 'hire_senior' | 'keep_juniors' | 'neutral';
  confidence: number;
  costSavings: number;
  productivityGain: number;
  reasoning: string[];
  metrics: {
    currentTeamOutput: number;
    projectedSeniorOutput: number;
    currentCost: number;
    seniorCost: number;
    roi: number;
  };
}

const HiringOptimizer = () => {
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [members, setMembers] = useState<DeveloperMetrics[]>([]);
  const [selectedJuniors, setSelectedJuniors] = useState<string[]>([]);
  const [seniorSalary, setSeniorSalary] = useState(120000);
  const [seniorProductivity, setSeniorProductivity] = useState(85);
  const [recommendation, setRecommendation] = useState<HiringRecommendation | null>(null);

  // Fetch team members
  useEffect(() => {
    const loadMembers = async () => {
      setLoading(true);
      try {
        const teams = await api.getTeams();
        const allMembers: DeveloperMetrics[] = [];
        
        teams.forEach(team => {
          team.members?.forEach(member => {
            // Calculate metrics from member data
            const tasksCompleted = member.tickets?.filter(t => t.status === 'Done').length || 0;
            const avgTaskTime = member.tickets?.length 
              ? member.tickets.reduce((sum, t) => sum + (t.estimatedHours || 8), 0) / member.tickets.length
              : 8;
            
            allMembers.push({
              name: member.name,
              role: member.role,
              performance: member.performance || 3.5,
              tasksCompleted,
              avgTaskTime,
              codeQuality: Math.round((member.performance || 3.5) * 20), // Convert 5-scale to 100-scale
              salary: member.role.toLowerCase().includes('senior') ? 100000 : 60000,
            });
          });
        });
        
        setMembers(allMembers.filter(m => m.role.toLowerCase().includes('engineer') || m.role.toLowerCase().includes('developer')));
      } catch (e: any) {
        toast.error('Failed to load team members');
      } finally {
        setLoading(false);
      }
    };
    
    loadMembers();
  }, []);

  const toggleJuniorSelection = (name: string) => {
    setSelectedJuniors(prev => 
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const analyzeHiring = () => {
    if (selectedJuniors.length === 0) {
      toast.error('Please select at least one junior developer to compare');
      return;
    }

    setAnalyzing(true);
    
    // Simulate API call with setTimeout
    setTimeout(() => {
      const juniorDevs = members.filter(m => selectedJuniors.includes(m.name));
      
      // Calculate current team metrics with safety checks
      const currentTeamOutput = juniorDevs.reduce((sum, dev) => {
        // Ensure we have valid numbers, default to 1 task if none completed
        const tasksCompleted = Math.max(dev.tasksCompleted, 1);
        const productivityScore = (dev.performance / 5) * (dev.codeQuality / 100) * tasksCompleted;
        return sum + productivityScore;
      }, 0);
      
      const currentCost = juniorDevs.reduce((sum, dev) => sum + dev.salary, 0);
      
      // Project senior developer output
      // Assumption: Senior = 2.5x average junior productivity
      const avgJuniorOutput = juniorDevs.length > 0 ? currentTeamOutput / juniorDevs.length : 0;
      const projectedSeniorOutput = avgJuniorOutput * 2.5 * (seniorProductivity / 85); // Adjust by productivity score
      
      const seniorCost = seniorSalary;
      
      // Calculate ROI with safety checks
      const costDiff = currentCost - seniorCost;
      const outputDiff = projectedSeniorOutput - currentTeamOutput;
      
      // Prevent division by zero
      const outputGainPct = currentTeamOutput > 0 ? (outputDiff / currentTeamOutput) * 100 : 0;
      const costChangePct = currentCost > 0 ? (costDiff / currentCost) * 100 : 0;
      const roi = outputGainPct - costChangePct;
      
      // Determine recommendation
      let recommendation: 'hire_senior' | 'keep_juniors' | 'neutral';
      let confidence = 0;
      const reasoning: string[] = [];
      
      if (roi > 15 && projectedSeniorOutput > currentTeamOutput * 0.8) {
        recommendation = 'hire_senior';
        confidence = Math.min(95, 60 + Math.abs(roi));
        reasoning.push(`Senior developer projected to deliver ${Math.round((projectedSeniorOutput / Math.max(currentTeamOutput, 1)) * 100)}% of current team output`);
        reasoning.push(`Cost ${costDiff > 0 ? 'savings' : 'increase'} of $${Math.abs(Math.round(costDiff)).toLocaleString()} annually`);
        reasoning.push(`Higher code quality and mentorship potential`);
        reasoning.push(`Reduced coordination overhead`);
      } else if (roi < -10) {
        recommendation = 'keep_juniors';
        confidence = Math.min(90, 60 + Math.abs(roi));
        reasoning.push(`Current team delivers ${juniorDevs.length}x parallel work capacity`);
        reasoning.push(`${costDiff < 0 ? 'Higher' : 'Lower'} total cost by $${Math.abs(Math.round(costDiff)).toLocaleString()}`);
        reasoning.push(`Team redundancy and knowledge distribution`);
        reasoning.push(`Junior developers show growth potential`);
      } else {
        recommendation = 'neutral';
        confidence = 50;
        reasoning.push(`Marginal difference in cost-effectiveness (ROI: ${roi.toFixed(1)}%)`);
        reasoning.push(`Consider team dynamics and project complexity`);
        reasoning.push(`Evaluate long-term growth and mentorship needs`);
      }
      
      setRecommendation({
        recommendation,
        confidence,
        costSavings: costDiff,
        productivityGain: outputDiff,
        reasoning,
        metrics: {
          currentTeamOutput,
          projectedSeniorOutput,
          currentCost,
          seniorCost,
          roi: isNaN(roi) ? 0 : roi, // Final safety check
        },
      });
      
      setAnalyzing(false);
    }, 1500);
  };

  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case 'hire_senior': return 'text-green-500';
      case 'keep_juniors': return 'text-blue-500';
      default: return 'text-yellow-500';
    }
  };

  const getRecommendationBg = (rec: string) => {
    switch (rec) {
      case 'hire_senior': return 'bg-green-500/10 border-green-500/30';
      case 'keep_juniors': return 'bg-blue-500/10 border-blue-500/30';
      default: return 'bg-yellow-500/10 border-yellow-500/30';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="container mx-auto p-6 space-y-6"
    >
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-8 py-6">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(168,85,247,0.12),transparent_60%)]" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 p-2.5 text-white shadow-lg">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <h1 className="text-xl font-bold text-white">Hiring Optimizer</h1>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 ring-1 ring-purple-500/30">AI-POWERED</span>
              </div>
              <p className="text-sm text-slate-400">
                Decision support for strategic hiring across teams
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs border-white/10 text-slate-300">
            <Zap className="h-3 w-3 mr-1" />
            HR Analytics
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel: Configuration */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Select Junior Developers
              </CardTitle>
              <CardDescription>
                Choose developers to compare against a senior hire
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading team members...</p>
              ) : (
                members
                  .filter(m => !m.role.toLowerCase().includes('senior'))
                  .map(member => (
                    <button
                      key={member.name}
                      onClick={() => toggleJuniorSelection(member.name)}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        selectedJuniors.includes(member.name)
                          ? 'bg-primary/10 border-primary'
                          : 'bg-muted/50 border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{member.name}</p>
                          <p className="text-xs text-muted-foreground">{member.role}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-medium">${(member.salary / 1000).toFixed(0)}k</p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <TrendingUp className="h-3 w-3" />
                            {member.performance.toFixed(1)}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Senior Developer Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Expected Salary</Label>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    value={seniorSalary}
                    onChange={(e) => setSeniorSalary(Number(e.target.value))}
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Annual compensation</p>
              </div>

              <div className="space-y-2">
                <Label>Expected Productivity Score</Label>
                <Slider
                  value={[seniorProductivity]}
                  onValueChange={(v) => setSeniorProductivity(v[0])}
                  min={50}
                  max={100}
                  step={5}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground text-right">{seniorProductivity}/100</p>
              </div>

              <Button
                onClick={analyzeHiring}
                disabled={analyzing || selectedJuniors.length === 0}
                className="w-full"
              >
                {analyzing ? (
                  <>Analyzing...</>
                ) : (
                  <>
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Run Analysis
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel: Results */}
        <div className="lg:col-span-2 space-y-4">
          {!recommendation ? (
            <Card className="h-full flex items-center justify-center min-h-[500px]">
              <CardContent className="text-center space-y-3 py-12">
                <div className="flex justify-center">
                  <div className="rounded-full bg-muted p-6">
                    <Info className="h-12 w-12 text-muted-foreground" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold">No Analysis Yet</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Select junior developers and configure the senior profile, then run the analysis
                  to get AI-powered hiring recommendations.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Recommendation Card */}
              <Card className={`border-2 ${getRecommendationBg(recommendation.recommendation)}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {recommendation.recommendation === 'hire_senior' ? (
                          <CheckCircle className="h-6 w-6 text-green-500" />
                        ) : recommendation.recommendation === 'keep_juniors' ? (
                          <Users className="h-6 w-6 text-blue-500" />
                        ) : (
                          <AlertCircle className="h-6 w-6 text-yellow-500" />
                        )}
                        <span className={getRecommendationColor(recommendation.recommendation)}>
                          {recommendation.recommendation === 'hire_senior'
                            ? 'Recommend: Hire Senior Developer'
                            : recommendation.recommendation === 'keep_juniors'
                            ? 'Recommend: Keep Junior Team'
                            : 'Neutral: Further Evaluation Needed'}
                        </span>
                      </CardTitle>
                      <CardDescription className="mt-2">
                        Confidence: {recommendation.confidence}% • Based on productivity, cost, and team dynamics
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Annual Cost Impact</p>
                      <p className={`text-2xl font-bold ${recommendation.costSavings > 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {recommendation.costSavings > 0 ? '+' : ''}${Math.abs(Math.round(recommendation.costSavings)).toLocaleString()}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">ROI Projection</p>
                      <p className={`text-2xl font-bold ${recommendation.metrics.roi > 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {recommendation.metrics.roi > 0 ? '+' : ''}{recommendation.metrics.roi.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Code className="h-4 w-4" />
                      Key Insights
                    </h4>
                    <ul className="space-y-2">
                      {recommendation.reasoning.map((reason, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <ArrowRight className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Metrics Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Current Team ({selectedJuniors.length} Juniors)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total Cost</span>
                      <span className="font-semibold">${Math.round(recommendation.metrics.currentCost).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Output Score</span>
                      <span className="font-semibold">{recommendation.metrics.currentTeamOutput.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Avg Performance</span>
                      <span className="font-semibold">
                        {(members.filter(m => selectedJuniors.includes(m.name)).reduce((sum, m) => sum + m.performance, 0) / selectedJuniors.length).toFixed(1)}/5.0
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Senior Developer (Projected)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total Cost</span>
                      <span className="font-semibold">${Math.round(recommendation.metrics.seniorCost).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Output Score</span>
                      <span className="font-semibold">{recommendation.metrics.projectedSeniorOutput.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Expected Performance</span>
                      <span className="font-semibold">{(seniorProductivity / 20).toFixed(1)}/5.0</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default HiringOptimizer;
