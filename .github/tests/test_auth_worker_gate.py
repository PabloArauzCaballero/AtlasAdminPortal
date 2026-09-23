"""El broker de identidad debe fallar el CI principal antes del deploy."""
from pathlib import Path
import yaml

ci = yaml.safe_load(Path('.github/workflows/ci.yml').read_text())
jobs = ci['jobs']
worker = jobs['auth-worker']
assert 'auth-worker' in jobs['deploy-dev']['needs']
steps = worker['steps']
commands = [step.get('run', '') for step in steps]
for required in (
    'yarn --cwd atlas-auth-broker-worker install --frozen-lockfile',
    'yarn --cwd atlas-auth-broker-worker format:check',
    'yarn --cwd atlas-auth-broker-worker lint',
    'yarn --cwd atlas-auth-broker-worker typecheck',
    'yarn --cwd atlas-auth-broker-worker test',
    'yarn --cwd atlas-auth-broker-worker build',
    'yarn --cwd atlas-auth-broker-worker smoke:e2e',
    'docker build -f atlas-auth-broker-worker/Dockerfile',
    'npm audit --audit-level=high',
):
    assert any(required in command for command in commands), required
assert not any(step.get('continue-on-error') for step in steps)
secret_command = '\n'.join(step.get('run', '') for step in jobs['secrets']['steps'])
assert 'gitleaks detect --no-git --source .' in secret_command
print('Broker de identidad dentro de CI, seguridad y deploy gate.')
