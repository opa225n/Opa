import { route, startRouter, navigate } from "./router.js";
import { isAuthenticated } from "./store.js";
import {
  renderWelcome,
  renderPhone,
  renderOtp,
  renderSetupProfile,
  renderSetupPin,
  renderUnlock,
} from "./screens/auth.js";
import { renderHome } from "./screens/home.js";
import {
  renderCreateInfo,
  renderCreateRules,
  renderCreateReview,
  renderInviteMembers,
  renderRotationOrder,
} from "./screens/createTontine.js";
import { renderJoin } from "./screens/join.js";
import { renderTontineDetail, renderCalendar } from "./screens/tontineDetail.js";
import { renderRoundDetail, renderDecisions, renderPayout } from "./screens/roundDetail.js";
import { renderPay, renderReceipt } from "./screens/pay.js";
import { renderHistory } from "./screens/history.js";
import { renderNotifications } from "./screens/notifications.js";
import { renderProfile } from "./screens/profile.js";

function guarded(renderFn) {
  return async (ctx) => {
    if (!isAuthenticated()) {
      navigate("/");
      return;
    }
    if (sessionStorage.getItem("tontine.unlocked") !== "1") {
      sessionStorage.setItem("tontine.afterUnlock", `/${location.hash.replace(/^#\//, "")}`);
      navigate("/unlock");
      return;
    }
    return renderFn(ctx);
  };
}

route("/", () => (isAuthenticated() ? navigate("/home") : renderWelcome()));
route("/phone", renderPhone);
route("/otp", renderOtp);
route("/setup-profile", renderSetupProfile);
route("/setup-pin", renderSetupPin);
route("/unlock", renderUnlock);
route("/join/:token", renderJoin);

route("/home", guarded(renderHome));
route("/create", guarded(renderCreateInfo));
route("/create/rules", guarded(renderCreateRules));
route("/create/review", guarded(renderCreateReview));
route("/tontine/:id/invite", guarded(renderInviteMembers));
route("/tontine/:id/order", guarded(renderRotationOrder));
route("/tontine/:id/calendar", guarded(renderCalendar));
route("/tontine/:id/history", guarded(renderHistory));
route("/tontine/:id", guarded(renderTontineDetail));
route("/round/:roundId/decisions", guarded(renderDecisions));
route("/round/:roundId", guarded(renderRoundDetail));
route("/payout/:roundId", guarded(renderPayout));
route("/pay/:contributionId", guarded(renderPay));
route("/receipt/:contributionId", guarded(renderReceipt));
route("/notifications", guarded(renderNotifications));
route("/profile", guarded(renderProfile));

startRouter();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
