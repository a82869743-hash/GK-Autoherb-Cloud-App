import paramiko
import sys

def run_remote_command(host, user, password, command):
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect(host, username=user, password=password)
        stdin, stdout, stderr = ssh.exec_command(command)
        print("STDOUT:")
        print(stdout.read().decode('utf-8', errors='replace'))
        print("STDERR:")
        print(stderr.read().decode('utf-8', errors='replace'))
    except Exception as e:
        print(f"Error: {e}")
    finally:
        ssh.close()

if __name__ == "__main__":
    run_remote_command('187.127.151.21', 'root', 'AryanSingh123@', 'cat /etc/nginx/sites-available/gkauto')
