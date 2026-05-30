export const metadata = {
  title: "Privacy Policy – NListener",
};

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px", fontFamily: "sans-serif", lineHeight: 1.7, color: "#1a1a1a" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>Privacy Policy</h1>
      <p style={{ color: "#666", marginBottom: 32 }}>Last updated: May 30, 2025</p>

      <p>
        NListener is developed and operated by <strong>Tomás Degano Sal</strong>. This policy
        explains what data the app collects and how it is used.
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32 }}>1. Data collected</h2>
      <p>The NListener Android app reads notification content from apps you explicitly select
        (e.g. MercadoPago). For each notification it captures:</p>
      <ul>
        <li>The notification title and text</li>
        <li>The name of the app that generated the notification</li>
        <li>A timestamp</li>
        <li>A device token that you configure during setup</li>
      </ul>
      <p>No personal identity information (name, email, phone number) is collected.</p>

      <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32 }}>2. How data is used</h2>
      <p>
        Captured notifications are sent to a server you configure yourself and displayed on a
        private dashboard accessible only with your token. The data is used solely to show
        payment alerts to authorized employees of your business.
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32 }}>3. Data sharing</h2>
      <p>
        We do not sell, rent, or share your data with any third party. Data is transmitted only
        to the server URL you configure in the app.
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32 }}>4. Data retention</h2>
      <p>
        Notification data is stored on your configured server. You are responsible for managing
        and deleting that data. The app itself does not retain notification content beyond the
        time needed to deliver it to your server.
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32 }}>5. Permissions</h2>
      <p>The app requests the following Android permissions:</p>
      <ul>
        <li><strong>Notification access</strong> – to read notifications from selected apps</li>
        <li><strong>Internet</strong> – to send notification data to your server</li>
        <li><strong>Foreground service</strong> – to keep the listener active in the background</li>
        <li><strong>Receive boot completed</strong> – to restart the service after device reboot</li>
        <li><strong>Wake lock</strong> – to ensure notifications are sent even when the screen is off</li>
        <li><strong>Camera</strong> – used only to scan the QR code during initial setup</li>
      </ul>

      <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32 }}>6. Children</h2>
      <p>
        NListener is not directed at children under 13. We do not knowingly collect data from
        children.
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32 }}>7. Changes to this policy</h2>
      <p>
        We may update this policy from time to time. Changes will be posted on this page with
        an updated date.
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 32 }}>8. Contact</h2>
      <p>
        If you have questions about this policy, contact:{" "}
        <a href="mailto:tomidegano@gmail.com" style={{ color: "#2563eb" }}>
          tomidegano@gmail.com
        </a>
      </p>
    </main>
  );
}
