// Surface a bounded failure explanation as a GitHub annotation; preserve the original exit code.
import {spawn} from 'node:child_process';
const [program,...args]=process.argv.slice(2);if(!program)throw Error('Missing CI command');
const child=spawn(program,args,{stdio:['inherit','pipe','pipe']});let tail='';
const output=(stream,data)=>{stream.write(data);tail=(tail+data.toString()).slice(-16000);};
child.stdout.on('data',d=>output(process.stdout,d));child.stderr.on('data',d=>output(process.stderr,d));
child.once('error',e=>{console.error(e.message);process.exitCode=1;});
child.once('exit',code=>{if(code!==0){const text=tail.replaceAll('%','%25').replaceAll('\r','%0D').replaceAll('\n','%0A');console.error(`::error title=CI command failed::${text}`);}process.exitCode=code??1;});
