# pickdi 배포 스크립트
# 사용법: PowerShell에서 .\deploy.ps1 또는 .\deploy.ps1 "커밋 메시지"

param(
    [string]$msg = "deploy: update dist"
)

Write-Host "`n🔨 1/4 웹 빌드 중..." -ForegroundColor Cyan
npx expo export -p web
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 빌드 실패" -ForegroundColor Red
    exit 1
}

Write-Host "`n📦 2/4 변경사항 스테이징..." -ForegroundColor Cyan
git add -A

$changes = git status --porcelain
if (-not $changes) {
    Write-Host "✅ 변경 사항 없음 — 배포 스킵" -ForegroundColor Yellow
    exit 0
}

Write-Host "`n💾 3/4 커밋 중: $msg" -ForegroundColor Cyan
git commit -m $msg

Write-Host "`n🚀 4/4 GitHub push → Vercel 자동 배포..." -ForegroundColor Cyan
git push

Write-Host "`n✅ 완료! Vercel이 자동으로 배포합니다." -ForegroundColor Green
Write-Host "   https://vercel.com 에서 진행 상황 확인 가능" -ForegroundColor Gray
