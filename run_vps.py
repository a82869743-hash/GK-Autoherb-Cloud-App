import paramiko
import sys

# Force UTF-8 encoding for standard output to handle characters like checkmarks
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

def run():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect('187.127.151.21', username='root', password='AryanSingh123@')
    
    commands = [
        "cd /root/app && git fetch origin && git reset --hard origin/main",
        "cd /root/app/client && npm install && npm run build",
        "cd /root/app/server && npm install --legacy-peer-deps && pm2 restart all",
        "systemctl restart nginx"
    ]
    
    for cmd in commands:
        print(f"--- Running: {cmd} ---")
        _, stdout, stderr = client.exec_command(cmd)
        
        # Read line by line to see progress
        for line in iter(stdout.readline, ""):
            try:
                print(line, end="")
            except UnicodeEncodeError:
                print(line.encode('ascii', 'replace').decode('ascii'), end="")
        for line in iter(stderr.readline, ""):
            try:
                print(line, end="")
            except UnicodeEncodeError:
                print(line.encode('ascii', 'replace').decode('ascii'), end="")
            
    client.close()

if __name__ == '__main__':
    run()
