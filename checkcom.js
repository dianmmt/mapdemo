// Prompt user to select a serial port
document.getElementById('check-port').addEventListener('click', async () => {
    try {
      const port = await navigator.serial.requestPort();
      console.log('Port selected:', port);
      // You can now open the port and communicate
      await port.open({ baudRate: 9600 }); 
      console.log('Port opened');
    } catch (error) {
      console.error('Error selecting or opening port:', error);
    }
  });
  
  // Get all ports the user has previously granted access to
  async function getGrantedPorts() {
    const ports = await navigator.serial.getPorts();
    console.log('Granted ports:', ports);
  }
  