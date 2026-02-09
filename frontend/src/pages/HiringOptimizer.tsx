
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Users, TrendingUp, Brain, DollarSign, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

import { API_BASE_URL } from '@/lib/api_config';

const API_BASE = API_BASE_URL;

interface HiringRecommendation {
  role: string;
  reason: string;
  priority: string;
  estimated_impact: string;
}

interface SkillGap {
  skill: string;
  demand: number;
  supply: number;
  gap: number;
  severity: string;
}

interface MemberVelocity {
  id: string;
  name: string;
  role: string;
  tickets_completed: number;
  velocity_tier: string;
}

interface HiringAnalytics {
  status: string;
  hiring_urgency_score: number;
  velocity: {
    total_completed: number;
    average_velocity: number;
    member_count: number;
    members: MemberVelocity[];
    bottlenecks: MemberVelocity[];
    recommendation: string;
  };
  skill_gaps: {
    coverage_score: number;
    critical_gaps: SkillGap[];
    hiring_recommendations: HiringRecommendation[];
  };
  cost_efficiency: {
    average_cost_per_point: number;
    total_monthly_cost: number;
    total_story_points: number;
    efficiency_score: number;
    recommendation: string;
  };
  top_recommendation: HiringRecommendation | null;
}

const useHiringAnalytics = () => {
  return useQuery<HiringAnalytics>({
    queryKey: ['hiring-analytics'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/hiring/analytics`);
      if (!res.ok) throw new Error('Failed to fetch hiring analytics');
      return res.json();
    },
    refetchInterval: 60000, // Refresh every minute
  });
};

const HiringOptimizer = () => {
  const { data, isLoading, error } = useHiringAnalytics();

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto py-10">
        <div className="rounded-xl border bg-card p-8 text-center space-y-6 shadow-sm">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-primary/10 mb-4">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
          <h1 className="text-2xl font-bold">Analyzing Team Data...</h1>
          <p className="text-muted-foreground">Querying Neo4j skill graph and velocity metrics</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto py-10">
        <div className="rounded-xl border bg-destructive/10 p-8 text-center space-y-4">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
          <h1 className="text-xl font-bold text-destructive">Connection Error</h1>
          <p className="text-muted-foreground">Unable to connect to hiring analytics. Please check the backend.</p>
        </div>
      </div>
    );
  }

  const urgencyColor = data.hiring_urgency_score > 70 ? 'text-red-500' :
    data.hiring_urgency_score > 40 ? 'text-amber-500' : 'text-emerald-500';

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              Hiring Optimization Engine
              <Badge variant="default" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                <CheckCircle className="h-3 w-3 mr-1" /> LIVE
              </Badge>
            </h1>
            <p className="text-sm text-muted-foreground">Real-time analysis from Neo4j skill graph</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Hiring Urgency</p>
          <p className={`text-3xl font-bold ${urgencyColor}`}>{data.hiring_urgency_score}%</p>
        </div>
      </div>

      {/* Top Recommendation Banner */}
      {data.top_recommendation && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Brain className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-primary">Top Recommendation</p>
                <p className="font-semibold">{data.top_recommendation.role}</p>
                <p className="text-sm text-muted-foreground mt-1">{data.top_recommendation.reason}</p>
                <Badge variant="outline" className="mt-2">{data.top_recommendation.estimated_impact}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Team Velocity Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              Team Velocity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-bold">{data.velocity.average_velocity}</span>
              <span className="text-sm text-muted-foreground">tickets/member</span>
            </div>
            <Progress value={Math.min(data.velocity.average_velocity * 20, 100)} className="h-2" />
            <p className="text-xs text-muted-foreground">{data.velocity.recommendation}</p>

            {data.velocity.bottlenecks.length > 0 && (
              <div className="pt-2 border-t">
                <p className="text-xs font-medium text-amber-600 mb-2">
                  ⚠ {data.velocity.bottlenecks.length} potential bottlenecks
                </p>
                <div className="space-y-1">
                  {data.velocity.bottlenecks.slice(0, 3).map((b) => (
                    <div key={b.id} className="text-xs flex justify-between">
                      <span className="truncate">{b.name}</span>
                      <span className="text-muted-foreground">{b.tickets_completed} tickets</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Skill Gap Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Brain className="h-4 w-4 text-purple-500" />
              Skill Coverage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-bold">{data.skill_gaps.coverage_score}%</span>
              <span className="text-sm text-muted-foreground">coverage</span>
            </div>
            <Progress
              value={data.skill_gaps.coverage_score}
              className={`h-2 ${data.skill_gaps.coverage_score < 70 ? '[&>div]:bg-amber-500' : ''}`}
            />

            {data.skill_gaps.critical_gaps.length > 0 && (
              <div className="pt-2 border-t">
                <p className="text-xs font-medium text-red-600 mb-2">Critical Skill Gaps</p>
                <div className="space-y-2">
                  {data.skill_gaps.critical_gaps.slice(0, 4).map((gap: SkillGap) => (
                    <div key={gap.skill} className="flex items-center justify-between text-xs">
                      <span className="font-medium">{gap.skill}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{gap.supply}/{gap.demand}</span>
                        <Badge
                          variant="outline"
                          className={
                            gap.severity === 'HIGH' ? 'border-red-500 text-red-500' :
                              gap.severity === 'MEDIUM' ? 'border-amber-500 text-amber-500' :
                                'border-gray-500 text-gray-500'
                          }
                        >
                          -{gap.gap}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cost Efficiency Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-500" />
              Cost Efficiency
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-bold">${data.cost_efficiency.average_cost_per_point}</span>
              <span className="text-sm text-muted-foreground">/story point</span>
            </div>
            <Progress value={data.cost_efficiency.efficiency_score} className="h-2" />
            <p className="text-xs text-muted-foreground">{data.cost_efficiency.recommendation}</p>

            <div className="pt-2 border-t grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-muted-foreground">Monthly Cost</p>
                <p className="font-medium">${data.cost_efficiency.total_monthly_cost.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Story Points</p>
                <p className="font-medium">{data.cost_efficiency.total_story_points}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hiring Recommendations */}
      {data.skill_gaps.hiring_recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Recommended Hires
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {data.skill_gaps.hiring_recommendations.map((rec: HiringRecommendation, idx: number) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border ${rec.priority === 'HIGH' ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950' :
                    rec.priority === 'MEDIUM' ? 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950' :
                      'border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900'
                    }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold">{rec.role}</p>
                    <Badge variant={rec.priority === 'HIGH' ? 'destructive' : 'secondary'}>
                      {rec.priority}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{rec.reason}</p>
                  <p className="text-xs font-medium text-primary">{rec.estimated_impact}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      <div className="text-center text-xs text-muted-foreground pt-4 border-t">
        Data sourced from Neo4j Knowledge Graph • Last updated: Just now
      </div>
    </div>
  );
};

export default HiringOptimizer;
