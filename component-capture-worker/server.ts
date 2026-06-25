import { createComponentCaptureApp } from "./lib/app.ts";

const PORT = Number(process.env.COMPONENT_CAPTURE_PORT ?? 8090);
const MAX_SCREENSHOTS = Math.min(
  5,
  Math.max(1, Number(process.env.COMPONENT_CAPTURE_MAX_SCREENSHOTS ?? 5)),
);

const app = createComponentCaptureApp();

app.listen(PORT, () => {
  console.log(
    JSON.stringify({
      event: "component_capture_worker_listening",
      port: PORT,
      max_screenshots: MAX_SCREENSHOTS,
    }),
  );
});
