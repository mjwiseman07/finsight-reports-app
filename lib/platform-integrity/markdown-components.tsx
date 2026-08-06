/**
 * Shared react-markdown component map for Platform Integrity methodology.
 * Used by MethodologyDrawer (client) and the public methodology page (server).
 */

import type { Components } from "react-markdown";

export const platformIntegrityMarkdownComponents: Components = {
  h1: ({ children, ...props }) => (
    <h1
      style={{ color: "#C9A961", fontWeight: 700, marginTop: "1.5em", fontSize: "1.5rem" }}
      {...props}
    >
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2
      style={{
        color: "#DFC084",
        fontWeight: 600,
        marginTop: "1.5em",
        fontSize: "1.25rem",
      }}
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3 style={{ color: "#ECEBE7", fontWeight: 600, marginTop: "1.25em" }} {...props}>
      {children}
    </h3>
  ),
  p: ({ children, ...props }) => (
    <p style={{ color: "#ECEBE7", lineHeight: 1.7, margin: "1em 0" }} {...props}>
      {children}
    </p>
  ),
  a: ({ children, href, ...props }) => (
    <a
      href={href}
      style={{ color: "#C9A961", textDecoration: "underline" }}
      target="_blank"
      rel="noreferrer noopener"
      {...props}
    >
      {children}
    </a>
  ),
  li: ({ children, ...props }) => (
    <li style={{ color: "#ECEBE7", lineHeight: 1.7, marginBottom: "0.35em" }} {...props}>
      {children}
    </li>
  ),
  code: ({ children, className, ...props }) => {
    const isBlock = Boolean(className);
    if (isBlock) {
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    }
    return (
      <code
        style={{
          backgroundColor: "#1A1A1C",
          color: "#DFC084",
          padding: "0.15em 0.35em",
          borderRadius: 4,
          fontSize: "0.9em",
        }}
        {...props}
      >
        {children}
      </code>
    );
  },
  blockquote: ({ children, ...props }) => (
    <blockquote
      style={{
        borderLeft: "3px solid #C9A961",
        color: "#A29E93",
        paddingLeft: "1em",
        margin: "1.25em 0",
        fontStyle: "italic",
      }}
      {...props}
    >
      {children}
    </blockquote>
  ),
  table: ({ children, ...props }) => (
    <table
      style={{
        borderCollapse: "collapse",
        width: "100%",
        fontSize: "0.9em",
        margin: "1.5em 0",
      }}
      {...props}
    >
      {children}
    </table>
  ),
  th: ({ children, ...props }) => (
    <th
      style={{
        borderBottom: "2px solid #C9A961",
        color: "#DFC084",
        padding: "0.6em 0.8em",
        textAlign: "left",
        backgroundColor: "#1A1A1C",
      }}
      {...props}
    >
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td
      style={{
        borderBottom: "1px solid rgba(201,169,97,0.15)",
        padding: "0.6em 0.8em",
        color: "#ECEBE7",
      }}
      {...props}
    >
      {children}
    </td>
  ),
};
