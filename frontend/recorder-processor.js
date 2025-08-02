class RecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer = [];
  }

  process(inputs) {
    const input = inputs[0];
    if (input && input[0]) {
      this.port.postMessage(input[0]); // send audio data to main thread
    }
    return true; // keep processor alive
  }
}
registerProcessor("recorder-processor", RecorderProcessor);