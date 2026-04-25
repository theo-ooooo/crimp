package io.crimp.api.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.ServletOutputStream;
import jakarta.servlet.WriteListener;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.BadCredentialsException;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** 401/403 핸들러가 신 envelope 포맷으로 응답하는지 회귀 방어. */
class RestAuthenticationEntryPointTest {

    private final ObjectMapper om = new ObjectMapper();

    @Test
    void writes_auth_required_envelope_with_401() throws IOException {
        RestAuthenticationEntryPoint entryPoint = new RestAuthenticationEntryPoint(om);

        HttpServletRequest req = mock(HttpServletRequest.class);
        HttpServletResponse res = mock(HttpServletResponse.class);
        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        when(res.getOutputStream()).thenReturn(asServletStream(buffer));

        entryPoint.commence(req, res, new BadCredentialsException("nope"));

        verify(res).setStatus(eq(401));
        verify(res).setContentType(eq("application/json"));

        @SuppressWarnings("unchecked") Map<String, Object> map = om.readValue(buffer.toByteArray(), Map.class);
        assertThat(map.get("status")).isEqualTo(false);
        assertThat(map).doesNotContainKey("data");
        @SuppressWarnings("unchecked") Map<String, Object> error = (Map<String, Object>) map.get("error");
        assertThat(error).containsEntry("code", "AUTH_REQUIRED");
        assertThat(error).containsEntry("message", "Authentication required");
    }

    @Test
    void access_denied_handler_writes_403_envelope() throws IOException {
        RestAccessDeniedHandler handler = new RestAccessDeniedHandler(om);

        HttpServletRequest req = mock(HttpServletRequest.class);
        HttpServletResponse res = mock(HttpServletResponse.class);
        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        when(res.getOutputStream()).thenReturn(asServletStream(buffer));

        handler.handle(req, res,
                new org.springframework.security.access.AccessDeniedException("denied"));

        verify(res).setStatus(eq(403));
        @SuppressWarnings("unchecked") Map<String, Object> map = om.readValue(buffer.toByteArray(), Map.class);
        assertThat(map.get("status")).isEqualTo(false);
        @SuppressWarnings("unchecked") Map<String, Object> error = (Map<String, Object>) map.get("error");
        assertThat(error).containsEntry("code", "FORBIDDEN_RESOURCE");
    }

    private static ServletOutputStream asServletStream(ByteArrayOutputStream buffer) {
        return new ServletOutputStream() {
            @Override public boolean isReady() { return true; }
            @Override public void setWriteListener(WriteListener writeListener) { }
            @Override public void write(int b) { buffer.write(b); }
        };
    }
}
