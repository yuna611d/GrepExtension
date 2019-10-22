const { performance } = require('perf_hooks');
import * as vscode from 'vscode';

export class TimeKeeper {

    protected _timeConsumingLimit = 3000;
    protected _countConfirmedCancellation = 0;
    protected _timeConsumingStart = 0;
    protected _isCancelled = false;

    public countStart() {
        this._timeConsumingStart = performance.now();   
    }

    public checkConsumedTime() {
        const measure = performance.now() - this._timeConsumingStart;            
        if (this._countConfirmedCancellation === 0 && measure > this._timeConsumingLimit) {
            vscode.window.showQuickPick(["Continue", "Cancel"],  {'placeHolder': 'Grep may need long time. Do you continue?' })
                .then(r => {
                    if (r === 'Cancel') {
                        this._isCancelled = true;
                    }
                }                
            );
            this._countConfirmedCancellation++;
        }
    }

    public isConfirmationTime(): boolean {
        return this._isCancelled;
    }

    public throwErrorIfCancelled() {
        this.checkConsumedTime();
        if (this._isCancelled) {
            throw new Error('GrepInterruptionError');
        }        
    }

}