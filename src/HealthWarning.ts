import KxsClient from "./KxsClient";

class HealthWarning {
	private warningElement: HTMLDivElement | null;
	kxsClient: KxsClient;

	constructor(kxsClient: KxsClient) {
		this.warningElement = null;
		this.kxsClient = kxsClient;

		this.createWarningElement();
		this.setFixedPosition();
	}

	private createWarningElement() {
		const warning = document.createElement("div");
		const uiTopLeft = document.getElementById("ui-top-left");

		warning.style.cssText = `
            position: fixed;
            background: rgba(0, 0, 0, 0.8);
            border: 2px solid #ff0000;
            border-radius: 5px;
            padding: 10px 15px;
            color: #ff0000;
            font-family: Arial, sans-serif;
            font-size: 14px;
            z-index: 9999;
            display: none;
            backdrop-filter: blur(5px);
            pointer-events: none;
        `;

		const content = document.createElement("div");
		content.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
        `;

		const icon = document.createElement("div");
		icon.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
        `;

		const text = document.createElement("span");
		text.textContent = "LOW HP!";

		if (uiTopLeft) {
			content.appendChild(icon);
			content.appendChild(text);
			warning.appendChild(content);
			uiTopLeft.appendChild(warning);
		}
		this.warningElement = warning;
		this.addPulseAnimation();
	}

	private setFixedPosition() {
		if (!this.warningElement) return;

		// Example
		this.warningElement.style.top = "742px";
		this.warningElement.style.left = "230px";

		//OR use transform use somethin like, this.warningElement.style.transform = `translate(20px, 20px)`; 
	}
	private addPulseAnimation() {
		const keyframes = `
            @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.5; }
                100% { opacity: 1; }
            }
        `;
		const style = document.createElement("style");
		style.textContent = keyframes;
		document.head.appendChild(style);

		if (this.warningElement) {
			this.warningElement.style.animation = "pulse 1.5s infinite";
		}
	}

	public show(health: number) {
		if (!this.warningElement) return;
		this.warningElement.style.display = "block";

		const span = this.warningElement.querySelector("span");
		if (span) {
			span.textContent = `LOW HP: ${health}%`;
		}
	}

	public hide() {
		if (!this.warningElement) return;
		this.warningElement.style.display = "none";
	}

	public update(health: number) {
		if (health <= 30 && health > 0) {
			this.show(health);
		} else {
			this.hide();
		}
	}
}

export { HealthWarning };
