import { Component, input, output } from "@angular/core";
import { OrderRow } from "../../domain/models";
import { DatePipe, DecimalPipe } from "@angular/common";
import { CloseButton } from "../close-button/close-button";
import { ProfitClassPipe } from "../profit-class.pipe";

@Component({
    selector: 'tr[appOrderDetailRow]',
    imports: [DatePipe, DecimalPipe, ProfitClassPipe, CloseButton],
    host: {'[class.alt]': 'alternate()'},
    templateUrl: './order-detail-row.html',
    styleUrl: './order-detail-row.scss'
})
export class OrderDetailRow {
    readonly row = input.required<OrderRow>();
    readonly alternate = input(false);
    readonly closeRequested = output<void>();
}