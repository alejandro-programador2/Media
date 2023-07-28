

// self.onmessage = (e) => {
//     self.postMessage('Got message from worker', e)
//     console.log('hol')
// }
// console.log(self);



export function hello(name) {
 return `Hello, ${name}`;
}