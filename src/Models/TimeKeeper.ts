import { performance } from 'perf_hooks';
import * as vscode from 'vscode';

/**
 * Thrown by TimeKeeper.throwErrorIfCancelled() when the user chose to cancel a long-running
 * grep. Lets callers tell an intentional cancellation apart from a genuine error, instead of
 * treating every exception the same way.
 */
export class CancellationError extends Error {
    constructor() {
        super('GrepInterruptionError');
        this.name = 'CancellationError';
    }
}

export class TimeKeeper {

    protected _timeConsumingLimit = 3000;
    protected _countConfirmedCancellation = 0;
    protected _timeConsumingStart = 0;
    protected _isCancelled = false;

    constructor() {
        this.resetTimeConsumingChecker();
    }

    public resetTimeConsumingChecker() {
        this._countConfirmedCancellation = 0;
        this._timeConsumingStart = performance.now();   
    }

    public checkConsumedTime() {
        const measure = performance.now() - this._timeConsumingStart;            
        if (this._countConfirmedCancellation === 0 && measure > this._timeConsumingLimit) {
            vscode.window.showQuickPick(["Continue", "Cancel"],  {'placeHolder': 'Grep may need long time. Do you continue?' })
                .then(r => {
                    if (r === 'Cancel') {
                        this._isCancelled = true;
                    } else {
                        this.resetTimeConsumingChecker();
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
            throw new CancellationError();
        }
    }

}