-- 대화 로그 테이블
CREATE TABLE IF NOT EXISTS chat_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  role TEXT CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  category TEXT,
  used_claude BOOLEAN DEFAULT false,
  tokens_used INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 에이전트 제안 테이블
CREATE TABLE IF NOT EXISTS agent_proposals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_type TEXT CHECK (proposal_type IN ('ai_response', 'db_data', 'code_change')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  diff_content TEXT,
  reviewer_security JSONB,
  reviewer_medical JSONB,
  reviewer_ux JSONB,
  all_approved BOOLEAN DEFAULT false,
  github_issue_url TEXT,
  notification_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 에이전트 실행 로그
CREATE TABLE IF NOT EXISTS agent_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  run_type TEXT,
  status TEXT,
  summary TEXT,
  proposals_created INTEGER DEFAULT 0,
  issues_created INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- RLS
ALTER TABLE chat_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 대화만 읽기 가능
CREATE POLICY "users_read_own_chats" ON chat_logs
  FOR SELECT USING (auth.uid() = user_id);

-- 사용자는 대화 삽입 가능 (Edge Function에서도 삽입)
CREATE POLICY "users_insert_chats" ON chat_logs
  FOR INSERT WITH CHECK (true);

-- agent_proposals와 agent_runs는 앱에서 직접 접근 불가 (service_role만)
CREATE POLICY "no_direct_proposals_access" ON agent_proposals
  FOR ALL USING (false);

CREATE POLICY "no_direct_runs_access" ON agent_runs
  FOR ALL USING (false);

-- 인덱스
CREATE INDEX IF NOT EXISTS chat_logs_user_id_idx ON chat_logs(user_id);
CREATE INDEX IF NOT EXISTS chat_logs_created_at_idx ON chat_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS chat_logs_category_idx ON chat_logs(category);
CREATE INDEX IF NOT EXISTS agent_proposals_type_idx ON agent_proposals(proposal_type);
CREATE INDEX IF NOT EXISTS agent_proposals_approved_idx ON agent_proposals(all_approved);
CREATE INDEX IF NOT EXISTS agent_proposals_created_at_idx ON agent_proposals(created_at DESC);
