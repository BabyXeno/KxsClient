import KxsClient from "./KxsClient";
import { PingTest } from "./Ping";

interface HealthChangeAnimation {
	element: HTMLElement;
	startTime: number;
	duration: number;
	value: number;
}

interface CounterPosition {
	left: number;
	top: number;
}

class KxsClientHUD {
	frameCount: number;
	fps: number;
	kills: number;
	private pingManager: PingTest;
	isMenuVisible: boolean;
	kxsClient: KxsClient;
	private healthAnimations: HealthChangeAnimation[] = [];
	private lastHealthValue: number = 100;

	constructor(kxsClient: KxsClient) {
		this.kxsClient = kxsClient;
		this.frameCount = 0;
		this.fps = 0;
		this.kills = 0;
		this.isMenuVisible = true;
		this.pingManager = new PingTest();

		if (this.kxsClient.isPingVisible) {
			this.initCounter("ping", "Ping", "45ms");
		}
		if (this.kxsClient.isFpsVisible) {
			this.initCounter("fps", "FPS", "60");
		}
		if (this.kxsClient.isKillsVisible) {
			this.initCounter("kills", "Kills", "0");
		}

		this.pingManager.start();
		this.setupWeaponBorderHandler();
		this.startUpdateLoop();
		this.escapeMenu();
		this.initFriendDetector();

		if (this.kxsClient.isKillFeedBlint) {
			if (document.readyState === 'loading') {
				document.addEventListener('DOMContentLoaded', this.initKillFeed);
			} else {
				this.initKillFeed()
			}
		}
	}

	private initFriendDetector() {
		// Initialize friends list
		let all_friends = this.kxsClient.all_friends.split(',') || [];

		if (all_friends.length >= 1) {
			// Create a cache for detected friends
			// Structure will be: { "friendName": timestamp }
			const friendsCache = {};
			// Cache duration in milliseconds (4 minutes = 240000 ms)
			const cacheDuration = 4 * 60 * 1000;

			// Select the element containing kill feeds
			const killfeedContents = document.querySelector('#ui-killfeed-contents');

			if (killfeedContents) {
				// Keep track of last seen content for each div
				const lastSeenContent = {
					"ui-killfeed-0": "",
					"ui-killfeed-1": "",
					"ui-killfeed-2": "",
					"ui-killfeed-3": "",
					"ui-killfeed-4": "",
					"ui-killfeed-5": ""
				};

				// Function to check if a friend is in the text with cache management
				const checkForFriends = (text: string, divId: string) => {
					// If the text is identical to the last seen, ignore
					// @ts-ignore
					if (text === lastSeenContent[divId]) return;

					// Update the last seen content
					// @ts-ignore
					lastSeenContent[divId] = text;

					// Ignore empty messages
					if (!text.trim()) return;

					// Current timestamp
					const currentTime = Date.now();

					// Check if a friend is mentioned
					for (let friend of all_friends) {
						if (friend !== "" && text.includes(friend)) {
							// Check if the friend is in the cache and if the cache is still valid
							// @ts-ignore
							const lastSeen = friendsCache[friend];
							if (!lastSeen || (currentTime - lastSeen > cacheDuration)) {
								// Update the cache
								// @ts-ignore
								friendsCache[friend] = currentTime;

								// Display notification
								this.kxsClient.nm.showNotification(
									`[FriendDetector] ${friend} is in this game`,
									"info",
									2300
								);
							}
							break;
						}
					}
				};

				// Function to check all kill feeds
				const checkAllKillfeeds = () => {
					all_friends = this.kxsClient.all_friends.split(',') || [];

					for (let i = 0; i <= 5; i++) {
						const divId = `ui-killfeed-${i}`;
						const killDiv = document.getElementById(divId);

						if (killDiv) {
							const textElement = killDiv.querySelector('.killfeed-text');
							if (textElement && textElement.textContent) {
								checkForFriends(textElement.textContent, divId);
							}
						}
					}
				};

				// Observe style or text changes in the entire container
				const observer = new MutationObserver(() => {
					checkAllKillfeeds();
				});

				// Start observing with a configuration that detects all changes
				observer.observe(killfeedContents, {
					childList: true,    // Observe changes to child elements
					subtree: true,      // Observe the entire tree
					characterData: true, // Observe text changes
					attributes: true    // Observe attribute changes (like style/opacity)
				});

				// Check current content immediately
				checkAllKillfeeds();

				console.log("Friend detector initialized with 4-minute cache");
			} else {
				console.warn("Killfeed-contents element not found");
			}
		}
	}

	private initKillFeed() {
		this.applyCustomStyles();
		this.setupObserver();
	}

	private escapeMenu() {
		const customStyles = `
    .ui-game-menu-desktop {
        background: linear-gradient(135deg, rgba(25, 25, 35, 0.95) 0%, rgba(15, 15, 25, 0.98) 100%) !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        border-radius: 12px !important;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3) !important;
        padding: 20px !important;
        backdrop-filter: blur(10px) !important;
        max-width: 350px !important;
        /* max-height: 80vh !important; */ /* Optional: Limit the maximum height */
        margin: auto !important;
        box-sizing: border-box !important;
        overflow-y: auto !important; /* Allow vertical scrolling if necessary */
    }
    
    /* Style pour les boutons de mode de jeu qui ont une image de fond */
    .btn-mode-cobalt,
    [style*="background: url("] {
        background-repeat: no-repeat !important;
        background-position: right center !important;
        background-size: auto 80% !important;
        position: relative !important;
        padding-right: 40px !important;
    }
    
    /* Ne pas appliquer ce style aux boutons standards comme Play Solo */
    #btn-start-mode-0 {
        background-repeat: initial !important;
        background-position: initial !important;
        background-size: initial !important;
        padding-right: initial !important;
    }

    .ui-game-menu-desktop::-webkit-scrollbar {
        width: 8px !important;
    }
    .ui-game-menu-desktop::-webkit-scrollbar-track {
        background: rgba(25, 25, 35, 0.5) !important;
        border-radius: 10px !important;
    }
    .ui-game-menu-desktop::-webkit-scrollbar-thumb {
        background-color: #4287f5 !important;
        border-radius: 10px !important;
        border: 2px solid rgba(25, 25, 35, 0.5) !important;
    }
    .ui-game-menu-desktop::-webkit-scrollbar-thumb:hover {
        background-color: #5a9eff !important;
    }

    .ui-game-menu-desktop {
        scrollbar-width: thin !important;
        scrollbar-color: #4287f5 rgba(25, 25, 35, 0.5) !important;
    }

    .kxs-header {
        display: flex;
        align-items: center;
        justify-content: flex-start;
        margin-bottom: 20px;
        padding: 10px;
        border-bottom: 2px solid rgba(255, 255, 255, 0.1);
    }

    .kxs-logo {
        width: 30px;
        height: 30px;
        margin-right: 10px;
        border-radius: 6px;
    }

    .kxs-title {
        font-size: 20px;
        font-weight: 700;
        color: #ffffff;
        text-transform: uppercase;
        text-shadow: 0 0 10px rgba(66, 135, 245, 0.5);
        font-family: 'Arial', sans-serif;
        letter-spacing: 2px;
    }

    .kxs-title span {
        color: #4287f5;
    }
        
    
    .btn-game-menu {
        background: linear-gradient(135deg, rgba(66, 135, 245, 0.1) 0%, rgba(66, 135, 245, 0.2) 100%) !important;
        border: 1px solid rgba(66, 135, 245, 0.3) !important;
        border-radius: 8px !important;
        color: #ffffff !important;
        transition: all 0.3s ease !important;
        margin: 5px 0 !important;
        padding: 12px !important;
        font-weight: 600 !important;
        width: 100% !important;
        text-align: center !important;
        display: block !important;
        box-sizing: border-box !important;
		line-height: 15px !important;
    }

    .btn-game-menu:hover {
        background: linear-gradient(135deg, rgba(66, 135, 245, 0.2) 0%, rgba(66, 135, 245, 0.3) 100%) !important;
        transform: translateY(-2px) !important;
        box-shadow: 0 4px 12px rgba(66, 135, 245, 0.2) !important;
    }

    .slider-container {
        background: rgba(66, 135, 245, 0.1) !important;
        border-radius: 8px !important;
        padding: 10px 15px !important;
        margin: 10px 0 !important;
        width: 100% !important;
        box-sizing: border-box !important;
    }

    .slider-text {
        color: #ffffff !important;
        font-size: 14px !important;
        margin-bottom: 8px !important;
        text-align: center !important;
    }

    .slider {
        -webkit-appearance: none !important;
        width: 100% !important;
        height: 6px !important;
        border-radius: 3px !important;
        background: rgba(66, 135, 245, 0.3) !important;
        outline: none !important;
        margin: 10px 0 !important;
    }

    .slider::-webkit-slider-thumb {
        -webkit-appearance: none !important;
        width: 16px !important;
        height: 16px !important;
        border-radius: 50% !important;
        background: #4287f5 !important;
        cursor: pointer !important;
        transition: all 0.3s ease !important;
    }

    .slider::-webkit-slider-thumb:hover {
        transform: scale(1.2) !important;
        box-shadow: 0 0 10px rgba(66, 135, 245, 0.5) !important;
    }

    .btns-game-double-row {
        display: flex !important;
        justify-content: center !important;
        gap: 10px !important;
        margin-bottom: 10px !important;
        width: 100% !important;
    }

    .btn-game-container {
        flex: 1 !important;
    }
    `;

		const addCustomStyles = (): void => {
			const styleElement = document.createElement('style');
			styleElement.textContent = customStyles;
			document.head.appendChild(styleElement);
		};

		const addKxsHeader = (): void => {
			const menuContainer = document.querySelector('#ui-game-menu') as HTMLElement;
			if (!menuContainer) return;

			const header = document.createElement('div');
			header.className = 'kxs-header';

			const title = document.createElement('span');
			title.className = 'kxs-title';
			title.innerHTML = '<span>Kxs</span> CLIENT';
			header.appendChild(title);
			menuContainer.insertBefore(header, menuContainer.firstChild);
		};

		if (document.querySelector('#ui-game-menu')) {
			addCustomStyles();
			addKxsHeader();
		}
	}

	private handleMessage(element: Element) {
		if (element instanceof HTMLElement && element.classList.contains('killfeed-div')) {
			const killfeedText = element.querySelector('.killfeed-text');
			if (killfeedText instanceof HTMLElement) {
				if (killfeedText.textContent && killfeedText.textContent.trim() !== '') {
					if (!killfeedText.hasAttribute('data-glint')) {
						killfeedText.setAttribute('data-glint', 'true');

						element.style.opacity = '1';

						setTimeout(() => {
							element.style.opacity = '0';
						}, 5000);
					}
				} else {
					element.style.opacity = '0';
				}
			}
		}
	}

	private setupObserver() {
		const killfeedContents = document.getElementById('ui-killfeed-contents');
		if (killfeedContents) {
			const observer = new MutationObserver((mutations) => {
				mutations.forEach((mutation) => {
					if (mutation.target instanceof HTMLElement &&
						mutation.target.classList.contains('killfeed-text')) {
						const parentDiv = mutation.target.closest('.killfeed-div');
						if (parentDiv) {
							this.handleMessage(parentDiv);
						}
					}
					mutation.addedNodes.forEach((node) => {
						if (node instanceof HTMLElement) {
							this.handleMessage(node);
						}
					});
				});
			});

			observer.observe(killfeedContents, {
				childList: true,
				subtree: true,
				characterData: true,
				attributes: true,
				attributeFilter: ['style', 'class']
			});

			killfeedContents.querySelectorAll('.killfeed-div').forEach(this.handleMessage);
		}
	}

	private applyCustomStyles() {
		const customStyles = document.createElement('style');
		if (this.kxsClient.isKillFeedBlint) {
			customStyles.innerHTML = `
        @import url('https://fonts.googleapis.com/css2?family=Oxanium:wght@600&display=swap');
  
        .killfeed-div {
            position: absolute !important;
            padding: 5px 10px !important;
            background: rgba(0, 0, 0, 0.7) !important;
            border-radius: 5px !important;
            transition: opacity 0.5s ease-out !important;
        }
  
        .killfeed-text {
            font-family: 'Oxanium', sans-serif !important;
            font-weight: bold !important;
            font-size: 16px !important;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5) !important;
            background: linear-gradient(90deg, 
                rgb(255, 0, 0), 
                rgb(255, 127, 0), 
                rgb(255, 255, 0), 
                rgb(0, 255, 0), 
                rgb(0, 0, 255), 
                rgb(75, 0, 130), 
                rgb(148, 0, 211), 
                rgb(255, 0, 0));
            background-size: 200%;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            animation: glint 3s linear infinite;
        }
  
        @keyframes glint {
            0% {
                background-position: 200% 0;
            }
            100% {
                background-position: -200% 0;
            }
        }
  
        .killfeed-div .killfeed-text:empty {
            display: none !important;
        }
      `;
		} else {
			customStyles.innerHTML = `
        .killfeed-div {
            position: absolute;
            padding: 5px 10px;
            background: rgba(0, 0, 0, 0.7);
            border-radius: 5px;
            transition: opacity 0.5s ease-out;
        }
  
        .killfeed-text {
            font-family: inherit;
            font-weight: normal;
            font-size: inherit;
            color: inherit;
            text-shadow: none;
            background: none;
        }
  
        .killfeed-div .killfeed-text:empty {
            display: none;
        }
      `;
		}
		document.head.appendChild(customStyles);
	}


	private handleResize() {
		const viewportWidth = window.innerWidth;
		const viewportHeight = window.innerHeight;

		for (const name of ['fps', 'kills', 'ping']) {
			const counterContainer = document.getElementById(`${name}CounterContainer`);
			if (!counterContainer) continue;

			const counter = this.kxsClient.counters[name];
			if (!counter) continue;

			const rect = counterContainer.getBoundingClientRect();
			const savedPosition = this.getSavedPosition(name);

			let newPosition = this.calculateSafePosition(
				savedPosition,
				rect.width,
				rect.height,
				viewportWidth,
				viewportHeight
			);

			this.applyPosition(counterContainer, newPosition);
			this.savePosition(name, newPosition);
		}
	}

	private calculateSafePosition(
		currentPosition: CounterPosition,
		elementWidth: number,
		elementHeight: number,
		viewportWidth: number,
		viewportHeight: number
	): CounterPosition {
		let { left, top } = currentPosition;

		if (left + elementWidth > viewportWidth) {
			left = viewportWidth - elementWidth;
		}
		if (left < 0) {
			left = 0;
		}

		if (top + elementHeight > viewportHeight) {
			top = viewportHeight - elementHeight;
		}
		if (top < 0) {
			top = 0;
		}

		return { left, top };
	}

	private getSavedPosition(name: string): CounterPosition {
		const savedPosition = localStorage.getItem(`${name}CounterPosition`);
		if (savedPosition) {
			try {
				return JSON.parse(savedPosition);
			} catch {
				return this.kxsClient.defaultPositions[name];
			}
		}
		return this.kxsClient.defaultPositions[name];
	}

	private applyPosition(element: HTMLElement, position: CounterPosition) {
		element.style.left = `${position.left}px`;
		element.style.top = `${position.top}px`;
	}

	private savePosition(name: string, position: CounterPosition) {
		localStorage.setItem(`${name}CounterPosition`, JSON.stringify(position));
	}

	startUpdateLoop() {
		const now = performance.now();
		const delta = now - this.kxsClient.lastFrameTime;

		this.frameCount++;

		if (delta >= 1000) {
			this.fps = Math.round((this.frameCount * 1000) / delta);
			this.frameCount = 0;
			this.kxsClient.lastFrameTime = now;

			this.kills = this.kxsClient.getKills();

			if (this.kxsClient.isFpsVisible && this.kxsClient.counters.fps) {
				this.kxsClient.counters.fps.textContent = `FPS: ${this.fps}`;
			}

			if (this.kxsClient.isKillsVisible && this.kxsClient.counters.kills) {
				this.kxsClient.counters.kills.textContent = `Kills: ${this.kills}`;
			}

			if (
				this.kxsClient.isPingVisible &&
				this.kxsClient.counters.ping &&
				this.pingManager
			) {
				const result = this.pingManager.getPingResult();
				this.kxsClient.counters.ping.textContent = `PING: ${result.ping} ms`;
			}
		}

		if (this.kxsClient.animationFrameCallback) {
			this.kxsClient.animationFrameCallback(() => this.startUpdateLoop());
		}
		this.updateUiElements();
		this.updateBoostBars();
		this.updateHealthBars();
		this.kxsClient.kill_leader?.update(this.kills);
	}

	initCounter(name: string, label: string, initialText: string) {
		const counter = document.createElement("div");
		counter.id = `${name}Counter`;
		const counterContainer = document.createElement("div");
		counterContainer.id = `${name}CounterContainer`;

		Object.assign(counterContainer.style, {
			position: "absolute",
			left: `${this.kxsClient.defaultPositions[name].left}px`,
			top: `${this.kxsClient.defaultPositions[name].top}px`,
			zIndex: "10000",
		});

		Object.assign(counter.style, {
			color: "white",
			backgroundColor: "rgba(0, 0, 0, 0.2)",
			borderRadius: "5px",
			fontFamily: "Arial, sans-serif",
			padding: "5px 10px",
			pointerEvents: "none",
			cursor: "default",
			width: `${this.kxsClient.defaultSizes[name].width}px`,
			height: `${this.kxsClient.defaultSizes[name].height}px`,
			display: "flex",
			alignItems: "center",
			justifyContent: "center",
			textAlign: "center",
			resize: "both",
			overflow: "hidden",
		});

		counter.textContent = `${label}: ${initialText}`;
		counterContainer.appendChild(counter);

		const uiTopLeft = document.getElementById("ui-top-left");
		if (uiTopLeft) {
			uiTopLeft.appendChild(counterContainer);
		}

		const adjustFontSize = () => {
			const { width, height } = counter.getBoundingClientRect();
			const size = Math.min(width, height) * 0.4;
			counter.style.fontSize = `${size}px`;
		};

		new ResizeObserver(adjustFontSize).observe(counter);

		counter.addEventListener("mousedown", (event) => {
			if (event.button === 1) {
				this.resetCounter(name, label, initialText);
				event.preventDefault();
			}
		});

		this.kxsClient.makeDraggable(counterContainer, `${name}CounterPosition`);
		this.kxsClient.counters[name] = counter;
	}

	resetCounter(name: string, label: string, initialText: string) {
		const counter = this.kxsClient.counters[name];
		const container = document.getElementById(`${name}CounterContainer`);

		if (!counter || !container) return;

		// Reset only this counter's position and size
		Object.assign(container.style, {
			left: `${this.kxsClient.defaultPositions[name].left}px`,
			top: `${this.kxsClient.defaultPositions[name].top}px`,
		});

		Object.assign(counter.style, {
			width: `${this.kxsClient.defaultSizes[name].width}px`,
			height: `${this.kxsClient.defaultSizes[name].height}px`,
			fontSize: "18px",
		});

		counter.textContent = `${label}: ${initialText}`;

		// Clear the saved position for this counter only
		localStorage.removeItem(`${name}CounterPosition`);
	}

	updateBoostBars() {
		const boostCounter = document.querySelector("#ui-boost-counter");
		if (boostCounter) {
			const boostBars = boostCounter.querySelectorAll(
				".ui-boost-base .ui-bar-inner",
			);

			let totalBoost = 0;
			const weights = [25, 25, 40, 10];

			boostBars.forEach((bar, index) => {
				const width = parseFloat((bar as HTMLElement).style.width);
				if (!isNaN(width)) {
					totalBoost += width * (weights[index] / 100);
				}
			});

			const averageBoost = Math.round(totalBoost);
			let boostDisplay = boostCounter.querySelector(".boost-display");

			if (!boostDisplay) {
				boostDisplay = document.createElement("div");
				boostDisplay.classList.add("boost-display");
				Object.assign((boostDisplay as HTMLElement).style, {
					position: "absolute",
					bottom: "75px",
					right: "335px",
					color: "#FF901A",
					backgroundColor: "rgba(0, 0, 0, 0.4)",
					padding: "5px 10px",
					borderRadius: "5px",
					fontFamily: "Arial, sans-serif",
					fontSize: "14px",
					zIndex: "10",
					textAlign: "center",
				});

				boostCounter.appendChild(boostDisplay);
			}

			boostDisplay.textContent = `AD: ${averageBoost}%`;
		}
	}

	setupWeaponBorderHandler() {
		const weaponContainers = Array.from(
			document.getElementsByClassName("ui-weapon-switch"),
		);
		weaponContainers.forEach((container) => {
			if (container.id === "ui-weapon-id-4") {
				(container as HTMLElement).style.border = "3px solid #2f4032";
			} else {
				(container as HTMLElement).style.border = "3px solid #FFFFFF";
			}
		});

		const weaponNames = Array.from(
			document.getElementsByClassName("ui-weapon-name"),
		);

		type ColorKey = 'ORANGE' | 'BLUE' | 'GREEN' | 'RED' | 'BLACK' | 'OLIVE' | 'ORANGE_RED' | 'PURPLE' | 'TEAL' | 'BROWN' | 'PINK' | 'DEFAULT';

		const WEAPON_COLORS: Record<ColorKey, string> = {
			ORANGE: '#FFAE00',
			BLUE: '#007FFF',
			GREEN: '#0f690d',
			RED: '#FF0000',
			BLACK: '#000000',
			OLIVE: '#808000',
			ORANGE_RED: '#FF4500',
			PURPLE: '#800080',
			TEAL: '#008080',
			BROWN: '#A52A2A',
			PINK: '#FFC0CB',
			DEFAULT: '#FFFFFF'
		};

		const WEAPON_COLOR_MAPPING: Record<ColorKey, string[]> = {
			ORANGE: ['CZ-3A1', 'G18C', 'M9', 'M93R', 'MAC-10', 'MP5', 'P30L', 'DUAL P30L', 'UMP9', 'VECTOR', 'VSS', 'FLAMETHROWER'],
			BLUE: ['AK-47', 'OT-38', 'OTS-38', 'M39 EMR', 'DP-28', 'MOSIN-NAGANT', 'SCAR-H', 'SV-98', 'M1 GARAND', 'PKP PECHENEG', 'AN-94', 'BAR M1918', 'BLR 81', 'SVD-63', 'M134', 'WATER GUN', 'GROZA', 'GROZA-S'],
			GREEN: ['FAMAS', 'M416', 'M249', 'QBB-97', 'MK 12 SPR', 'M4A1-S', 'SCOUT ELITE', 'L86A2'],
			RED: ['M870', 'MP220', 'SAIGA-12', 'SPAS-12', 'USAS-12', 'SUPER 90', 'LASR GUN', 'M1100'],
			BLACK: ['DEAGLE 50', 'RAINBOW BLASTER'],
			OLIVE: ['AWM-S', 'MK 20 SSR'],
			ORANGE_RED: ['FLARE GUN'],
			PURPLE: ['MODEL 94', 'PEACEMAKER', 'VECTOR (.45 ACP)', 'M1911', 'M1A1', 'MK45G'],
			TEAL: ['M79'],
			BROWN: ['POTATO CANNON', 'SPUD GUN'],
			PINK: ['HEART CANNON'],
			DEFAULT: []
		};

		weaponNames.forEach((weaponNameElement) => {
			const weaponContainer = weaponNameElement.closest(".ui-weapon-switch");

			const observer = new MutationObserver(() => {
				const weaponName = weaponNameElement.textContent?.trim()?.toUpperCase() || '';

				let colorKey: ColorKey = 'DEFAULT';

				// Do a hack for "VECTOR" gun (because can be 2 weapons: yellow or purple)
				if (weaponName === "VECTOR") {
					// Get the weapon container and image element
					const weaponContainer = weaponNameElement.closest(".ui-weapon-switch");
					const weaponImage = weaponContainer?.querySelector(".ui-weapon-image") as HTMLImageElement;

					if (weaponImage && weaponImage.src) {
						// Check the image source to determine which Vector it is
						if (weaponImage.src.includes("-acp") || weaponImage.src.includes("45")) {
							colorKey = 'PURPLE';
						} else {
							colorKey = 'ORANGE';
						}
					} else {
						// Default to orange if we can't determine the type
						colorKey = 'ORANGE';
					}
				} else {
					colorKey = (Object.entries(WEAPON_COLOR_MAPPING)
						.find(([_, weapons]) => weapons.includes(weaponName))?.[0] || 'DEFAULT') as ColorKey;
				}

				if (weaponContainer && weaponContainer.id !== "ui-weapon-id-4") {
					(weaponContainer as HTMLElement).style.border = `3px solid ${WEAPON_COLORS[colorKey]}`;
				}
			});

			observer.observe(weaponNameElement, { childList: true, characterData: true, subtree: true });
		});
	}

	updateUiElements() {
		const currentUrl = window.location.href;

		const isSpecialUrl = /\/#\w+/.test(currentUrl);

		const playerOptions = document.getElementById("player-options");
		const teamMenuContents = document.getElementById("team-menu-contents");
		const startMenuContainer = document.querySelector(
			"#start-menu .play-button-container",
		);

		// Update counters draggable state based on LSHIFT menu visibility
		this.updateCountersDraggableState();

		if (!playerOptions) return;

		if (
			isSpecialUrl &&
			teamMenuContents &&
			playerOptions.parentNode !== teamMenuContents
		) {
			teamMenuContents.appendChild(playerOptions);
		} else if (
			!isSpecialUrl &&
			startMenuContainer &&
			playerOptions.parentNode !== startMenuContainer
		) {
			const firstChild = startMenuContainer.firstChild;
			startMenuContainer.insertBefore(playerOptions, firstChild);
		}
		const teamMenu = document.getElementById("team-menu");
		if (teamMenu) {
			teamMenu.style.height = "355px";
		}
		const menuBlocks = document.querySelectorAll(".menu-block");
		menuBlocks.forEach((block) => {
			(block as HTMLElement).style.maxHeight = "355px";
		});
		//scalable?
	}

	updateMenuButtonText() {
		const hideButton = document.getElementById("hideMenuButton")!;
		hideButton.textContent = this.isMenuVisible
			? "Hide Menu [P]"
			: "Show Menu [P]";
	}

	updateHealthBars() {
		const healthBars = document.querySelectorAll("#ui-health-container");
		healthBars.forEach((container) => {
			const bar = container.querySelector("#ui-health-actual");
			if (bar) {
				const currentHealth = Math.round(parseFloat((bar as HTMLElement).style.width));
				let percentageText = container.querySelector(".health-text");

				// Create or update percentage text
				if (!percentageText) {
					percentageText = document.createElement("span");
					percentageText.classList.add("health-text");
					Object.assign((percentageText as HTMLElement).style, {
						width: "100%",
						textAlign: "center",
						marginTop: "5px",
						color: "#333",
						fontSize: "20px",
						fontWeight: "bold",
						position: "absolute",
						zIndex: "10",
					});
					container.appendChild(percentageText);
				}

				// Check for health change
				if (currentHealth !== this.lastHealthValue) {
					const healthChange = currentHealth - this.lastHealthValue;
					if (healthChange !== 0) {
						this.showHealthChangeAnimation(container as HTMLElement, healthChange);
					}
					this.lastHealthValue = currentHealth;
				}

				if (this.kxsClient.isHealthWarningEnabled) {
					this.kxsClient.healWarning?.update(currentHealth);
				} else {
					this.kxsClient.healWarning?.hide();
				}
				percentageText.textContent = `${currentHealth}%`;

				// Update animations
				this.updateHealthAnimations();
			}
		});
	}

	private showHealthChangeAnimation(container: HTMLElement, change: number) {
		const animation = document.createElement("div");
		const isPositive = change > 0;

		Object.assign(animation.style, {
			position: "absolute",
			color: isPositive ? "#2ecc71" : "#e74c3c",
			fontSize: "24px",
			fontWeight: "bold",
			fontFamily: "Arial, sans-serif",
			textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
			pointerEvents: "none",
			zIndex: "100",
			opacity: "1",
			top: "50%",
			right: "-80px", // Position à droite de la barre de vie
			transform: "translateY(-50%)", // Centre verticalement
			whiteSpace: "nowrap", // Empêche le retour à la ligne
		});

		// Check if change is a valid number before displaying it
		if (!isNaN(change)) {
			animation.textContent = `${isPositive ? "+" : ""}${change} HP`;
		} else {
			// Skip showing animation if change is NaN
			return;
		}

		container.appendChild(animation);

		this.healthAnimations.push({
			element: animation,
			startTime: performance.now(),
			duration: 1500, // Animation duration in milliseconds
			value: change,
		});
	}

	private updateCountersDraggableState() {
		const isMenuOpen = this.kxsClient.secondaryMenu?.getMenuVisibility() || false;
		const counters = ['fps', 'kills', 'ping'];

		counters.forEach(name => {
			const counter = document.getElementById(`${name}Counter`);
			if (counter) {
				// Mise à jour des propriétés de draggabilité
				counter.style.pointerEvents = isMenuOpen ? 'auto' : 'none';
				counter.style.cursor = isMenuOpen ? 'move' : 'default';

				// Mise à jour de la possibilité de redimensionnement
				counter.style.resize = isMenuOpen ? 'both' : 'none';
			}
		});
	}

	private updateHealthAnimations() {
		const currentTime = performance.now();

		this.healthAnimations = this.healthAnimations.filter(animation => {
			const elapsed = currentTime - animation.startTime;
			const progress = Math.min(elapsed / animation.duration, 1);

			if (progress < 1) {
				// Update animation position and opacity
				// Maintenant l'animation se déplace horizontalement vers la droite
				const translateX = progress * 20; // Déplacement horizontal
				Object.assign(animation.element.style, {
					transform: `translateY(-50%) translateX(${translateX}px)`,
					opacity: String(1 - progress),
				});
				return true;
			} else {
				// Remove completed animation
				animation.element.remove();
				return false;
			}
		});
	}
}

export { KxsClientHUD };
