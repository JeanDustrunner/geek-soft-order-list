import { inject, Injectable } from "@angular/core";
import { Subject } from "rxjs";
import { Quote } from "../domain/models";
import { parseQuotesMessage } from "../domain/quotes.parser";
import { ORDERS_FEATURE_CONFIG } from "./orders-feature.config";


@Injectable()
export class WebSocketService {
    readonly #url = inject(ORDERS_FEATURE_CONFIG).quotesWsUrl;
    readonly #quotes = new Subject<Quote[]>();
    readonly quotes$ = this.#quotes.asObservable()

    #socket: WebSocket | null = null;
    #desired = new Set<string>();
    #retries = 0;
    #reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    #stopped = true;

    connect(): void {
        this.#stopped = false;
        this.#open();
    }

    disconnect(): void {
        this.#stopped = true;
        clearTimeout(this.#reconnectTimer);
        this.#socket?.close();
        this.#socket = null;
    }

    setSymbols(symbols: readonly string[]): void {
        const next = new Set(symbols);
        const added = [...next].filter(symbol => !this.#desired.has(symbol));
        const removed = [...this.#desired].filter(symbol => !next.has(symbol));
        this.#desired = next;
        this.#send('/subscribe/addlist', added);
        this.#send('/subscribe/removelist', removed);
    }

    #open():void {
        const socket = new WebSocket(this.#url);
        socket.onopen = () => {
            this.#retries = 0;
            this.#send('/subscribe/addlist', [...this.#desired])
        }
        socket.onmessage = event => {
            const quotes = parseQuotesMessage(event.data);
            if (quotes?.length) this.#quotes.next(quotes)
        }
        socket.onclose = () => {
            if (this.#stopped) return;
            const delay = Math.min(30_000, 1_000 * 2 ** this.#retries++);
            this.#reconnectTimer = setTimeout(() => this.#open(), delay)
        }
        this.#socket = socket;
    }
    
    #send(p: string, d: readonly string[]): void {
        if (d?.length && this.#socket?.readyState === WebSocket.OPEN)
            this.#socket.send(JSON.stringify({ p, d }));
    };
}