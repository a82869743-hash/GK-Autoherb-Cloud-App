import paramiko
import sys

def run_ssh_cmd(host, password, cmd):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(hostname=host, username='root', password=password, timeout=10)
        print(f"Connected to {host}")
        stdin, stdout, stderr = client.exec_command(cmd)
        out = stdout.read().decode('utf-8', 'replace')
        err = stderr.read().decode('utf-8', 'replace')
        if out: print("STDOUT:\n", out.encode('ascii', 'replace').decode())
        if err: print("STDERR:\n", err.encode('ascii', 'replace').decode())
    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(1)
    run_ssh_cmd("187.127.151.21", "AryanSingh123@", sys.argv[1])
