import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import * as ElectronApp from "../electron/ElectronApp.ts";
import * as ElectronTray from "../electron/ElectronTray.ts";
import * as DesktopAssets from "./DesktopAssets.ts";
import * as DesktopEnvironment from "./DesktopEnvironment.ts";
import { makeComponentLogger } from "./DesktopObservability.ts";
import * as DesktopWindow from "../window/DesktopWindow.ts";

export class DesktopTrayConfigureError extends Schema.TaggedErrorClass<DesktopTrayConfigureError>()(
  "DesktopTrayConfigureError",
  {
    cause: Schema.Defect(),
  },
) {
  override get message(): string {
    return "Failed to configure desktop system tray.";
  }
}

export class DesktopTray extends Context.Service<
  DesktopTray,
  {
    readonly configure: Effect.Effect<void, DesktopTrayConfigureError>;
    readonly destroy: Effect.Effect<void>;
  }
>()("@t3tools/desktop/app/DesktopTray") {}

const {
  logInfo: logTrayInfo,
  logError: logTrayError,
  logWarning: logTrayWarning,
} = makeComponentLogger("desktop-tray");

export const make = Effect.gen(function* () {
  const environment = yield* DesktopEnvironment.DesktopEnvironment;
  const desktopAssets = yield* DesktopAssets.DesktopAssets;
  const desktopWindow = yield* DesktopWindow.DesktopWindow;
  const electronTray = yield* ElectronTray.ElectronTray;
  const electronApp = yield* ElectronApp.ElectronApp;
  const context = yield* Effect.context<DesktopWindow.DesktopWindow | ElectronApp.ElectronApp>();
  const runPromise = Effect.runPromiseWith(context);

  const destroy = electronTray.destroy;

  const configure: Effect.Effect<void, DesktopTrayConfigureError> = Effect.gen(function* () {
    // System tray is active on Windows to retain background running when windows are closed
    if (environment.platform !== "win32") {
      return;
    }

    const iconPaths = yield* desktopAssets.iconPaths;
    const iconPath = Option.getOrElse(
      iconPaths.ico,
      () => Option.getOrUndefined(iconPaths.png) ?? "",
    );

    if (!iconPath) {
      yield* logTrayWarning("tray icon path not found, skipping tray initialization");
      return;
    }

    const createEffect = electronTray.create({
      iconPath,
      tooltip: environment.displayName,
      onClick: () => {
        void runPromise(desktopWindow.activate);
      },
      onDoubleClick: () => {
        void runPromise(desktopWindow.activate);
      },
      menuItems: [
        {
          label: `Open ${environment.displayName}`,
          click: () => {
            void runPromise(desktopWindow.activate);
          },
        },
        {
          type: "separator",
        },
        {
          label: `Quit ${environment.displayName}`,
          click: () => {
            void runPromise(electronApp.quit);
          },
        },
      ],
    });

    yield* createEffect.pipe(
      Effect.mapError((cause) => new DesktopTrayConfigureError({ cause })),
      Effect.tap(() => logTrayInfo("system tray configured successfully")),
      Effect.catchIf(
        () => true,
        (error) => logTrayError("failed to initialize system tray", { error: error.message }),
      ),
    );
  }).pipe(Effect.withSpan("desktop.tray.configure"));

  return DesktopTray.of({
    configure,
    destroy,
  });
});

export const layer = Layer.effect(DesktopTray, make);
