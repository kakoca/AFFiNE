Erro ao falar com a ia:

    litellm:

        File "/usr/lib/python3.13/site-packages/litellm/router.py", line 2954, in _ageneric_api_call_with_fallbacks

            raise e

        File "/usr/lib/python3.13/site-packages/litellm/router.py", line 2941, in _ageneric_api_call_with_fallbacks

            response = await self.async_function_with_fallbacks(**kwargs)

                    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

        File "/usr/lib/python3.13/site-packages/litellm/router.py", line 4292, in async_function_with_fallbacks

            return await self.async_function_with_fallbacks_common_utils(

                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

            ...<8 lines>...

            )

            ^

        File "/usr/lib/python3.13/site-packages/litellm/router.py", line 4250, in async_function_with_fallbacks_common_utils

            raise original_exception

        File "/usr/lib/python3.13/site-packages/litellm/router.py", line 4284, in async_function_with_fallbacks

            response = await self.async_function_with_retries(*args, **kwargs)

                    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

        File "/usr/lib/python3.13/site-packages/litellm/router.py", line 4489, in async_function_with_retries

            raise original_exception

        File "/usr/lib/python3.13/site-packages/litellm/router.py", line 4380, in async_function_with_retries

            response = await self.make_call(original_function, *args, **kwargs)

                    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

        File "/usr/lib/python3.13/site-packages/litellm/router.py", line 4500, in make_call

            response = await response

                    ^^^^^^^^^^^^^^

        File "/usr/lib/python3.13/site-packages/litellm/router.py", line 3066, in _ageneric_api_call_with_fallbacks_helper

            raise e

        File "/usr/lib/python3.13/site-packages/litellm/router.py", line 3052, in _ageneric_api_call_with_fallbacks_helper

            response = await response  # type: ignore

                    ^^^^^^^^^^^^^^

        File "/usr/lib/python3.13/site-packages/litellm/utils.py", line 1643, in wrapper_async

            raise e

        File "/usr/lib/python3.13/site-packages/litellm/utils.py", line 1489, in wrapper_async

            result = await original_function(*args, **kwargs)

                    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

        File "/usr/lib/python3.13/site-packages/litellm/llms/anthropic/experimental_pass_through/messages/handler.py", line 90, in anthropic_messages

            response = await init_response

                    ^^^^^^^^^^^^^^^^^^^

        File "/usr/lib/python3.13/site-packages/litellm/llms/custom_httpx/llm_http_handler.py", line 1896, in async_anthropic_messages_handler

            raise self._handle_error(

                ~~~~~~~~~~~~~~~~~~^

                e=e, provider_config=anthropic_messages_provider_config

                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

            )

            ^

        File "/usr/lib/python3.13/site-packages/litellm/llms/custom_httpx/llm_http_handler.py", line 3595, in _handle_error

            raise provider_config.get_error_class(

            ...<3 lines>...

            )

        litellm.llms.base_llm.chat.transformation.BaseLLMException: {"message":"Too many tokens per day, please wait before trying again."}

        INFO:     172.21.0.1:55962 - "POST /v1/messages HTTP/1.1" 429 Too Many Requests

        15:28:16 - LiteLLM:INFO: mcp_server_manager.py:1972 - Found 0 MCP servers in database

        15:28:16 - LiteLLM Proxy:INFO: proxy_server.py:3796 - Loading 0 search tool(s) from database into router


terminal server:
    APICallError [AI_APICallError]: Too Many Requests
            at file:///C:/dev/AFFiNE/node_modules/@ai-sdk/provider-utils/dist/index.mjs:950:14
            at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
            at async postToApi (file:///C:/dev/AFFiNE/node_modules/@ai-sdk/provider-utils/dist/index.mjs:781:28)
            at async AnthropicMessagesLanguageModel.doStream (file:///C:/dev/AFFiNE/node_modules/@ai-sdk/anthropic/dist/index.mjs:2344:50)
            at async fn (file:///C:/dev/AFFiNE/node_modules/ai/dist/index.mjs:4985:27)
            at async file:///C:/dev/AFFiNE/node_modules/ai/dist/index.mjs:1557:22
            at async _retryWithExponentialBackoff (file:///C:/dev/AFFiNE/node_modules/ai/dist/index.mjs:1708:12)
            at async streamStep (file:///C:/dev/AFFiNE/node_modules/ai/dist/index.mjs:4941:15)
            at async fn (file:///C:/dev/AFFiNE/node_modules/ai/dist/index.mjs:5282:9)
            at async file:///C:/dev/AFFiNE/node_modules/ai/dist/index.mjs:1557:22 {
        cause: undefined,
        url: 'http://localhost:4000/v1/messages',
        requestBodyValues: [Object],
        statusCode: 429,
        responseHeaders: [Object],
        responseBody: `{"error":{"message":"{\\"message\\":\\"Too many tokens per day, please wait before trying again.\\"}. Received Model Group=claude-4-5-haiku\\nAvailable Model Group Fallbacks=['claude-3-haiku']\\nError doing the fallback: {\\"message\\":\\"Too many tokens per day, please wait before trying again.\\"}","type":"None","param":"None","code":"429"}}`,
        isRetryable: true,
        data: undefined,
        [Symbol(vercel.ai.error)]: true,
        [Symbol(vercel.ai.error.AI_APICallError)]: true
        },
        APICallError [AI_APICallError]: Too Many Requests
            at file:///C:/dev/AFFiNE/node_modules/@ai-sdk/provider-utils/dist/index.mjs:950:14
            at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
            at async postToApi (file:///C:/dev/AFFiNE/node_modules/@ai-sdk/provider-utils/dist/index.mjs:781:28)
            at async AnthropicMessagesLanguageModel.doStream (file:///C:/dev/AFFiNE/node_modules/@ai-sdk/anthropic/dist/index.mjs:2344:50)
            at async fn (file:///C:/dev/AFFiNE/node_modules/ai/dist/index.mjs:4985:27)
            at async file:///C:/dev/AFFiNE/node_modules/ai/dist/index.mjs:1557:22
            at async _retryWithExponentialBackoff (file:///C:/dev/AFFiNE/node_modules/ai/dist/index.mjs:1708:12)
            at async streamStep (file:///C:/dev/AFFiNE/node_modules/ai/dist/index.mjs:4941:15)
            at async fn (file:///C:/dev/AFFiNE/node_modules/ai/dist/index.mjs:5282:9)
            at async file:///C:/dev/AFFiNE/node_modules/ai/dist/index.mjs:1557:22 {
        cause: undefined,
        url: 'http://localhost:4000/v1/messages',
        requestBodyValues: [Object],
        statusCode: 429,
        responseHeaders: [Object],
        responseBody: `{"error":{"message":"{\\"message\\":\\"Too many tokens per day, please wait before trying again.\\"}. Received Model Group=claude-4-5-haiku\\nAvailable Model Group Fallbacks=['claude-3-haiku']\\nError doing the fallback: {\\"message\\":\\"Too many tokens per day, please wait before trying again.\\"}","type":"None","param":"None","code":"429"}}`,
        isRetryable: true,
        data: undefined,
        [Symbol(vercel.ai.error)]: true,
        [Symbol(vercel.ai.error.AI_APICallError)]: true
        }
    ],
    lastError: APICallError [AI_APICallError]: Too Many Requests
        at file:///C:/dev/AFFiNE/node_modules/@ai-sdk/provider-utils/dist/index.mjs:950:14
        at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
        at async postToApi (file:///C:/dev/AFFiNE/node_modules/@ai-sdk/provider-utils/dist/index.mjs:781:28)
        at async AnthropicMessagesLanguageModel.doStream (file:///C:/dev/AFFiNE/node_modules/@ai-sdk/anthropic/dist/index.mjs:2344:50)
        at async fn (file:///C:/dev/AFFiNE/node_modules/ai/dist/index.mjs:4985:27)
        at async file:///C:/dev/AFFiNE/node_modules/ai/dist/index.mjs:1557:22
        at async _retryWithExponentialBackoff (file:///C:/dev/AFFiNE/node_modules/ai/dist/index.mjs:1708:12)
        at async streamStep (file:///C:/dev/AFFiNE/node_modules/ai/dist/index.mjs:4941:15)
        at async fn (file:///C:/dev/AFFiNE/node_modules/ai/dist/index.mjs:5282:9)
        at async file:///C:/dev/AFFiNE/node_modules/ai/dist/index.mjs:1557:22 {
        cause: undefined,
        url: 'http://localhost:4000/v1/messages',
        requestBodyValues: {
        model: 'claude-4-5-haiku',
        max_tokens: 4096,
        temperature: undefined,
        top_k: undefined,
        top_p: undefined,
        stop_sequences: undefined,
        system: [Array],
        messages: [Array],
        tools: [Array],
        tool_choice: [Object],
        stream: true
        },
        statusCode: 429,
        responseHeaders: {
        'content-length': '335',
        'content-type': 'application/json',
        date: 'Wed, 24 Dec 2025 15:29:10 GMT',
        server: 'uvicorn',
        'x-litellm-key-spend': '0.0',
        'x-litellm-model-id': 'ea7e5f8bfa62ac78e4539b0118f94c6aabbd5e9d98355b1850454e2d8d3f5cb8',
        'x-litellm-response-cost': '0',
        'x-litellm-timeout': '600',
        'x-litellm-version': '1.80.7'
        },
        responseBody: `{"error":{"message":"{\\"message\\":\\"Too many tokens per day, please wait before trying again.\\"}. Received Model Group=claude-4-5-haiku\\nAvailable Model Group Fallbacks=['claude-3-haiku']\\nError doing the fallback: {\\"message\\":\\"Too many tokens per day, please wait before trying again.\\"}","type":"None","param":"None","code":"429"}}`,
        isRetryable: true,
        data: undefined,
        [Symbol(vercel.ai.error)]: true,
        [Symbol(vercel.ai.error.AI_APICallError)]: true
    },
    [Symbol(vercel.ai.error)]: true,
    [Symbol(vercel.ai.error.AI_RetryError)]: true
    }
    [Nest] 41228  - 24/12/2025, 12:29:23   ERROR [AnthropicOfficialProvider] <selfhosted:http:6b48ec53-95c9-464e-87f8-0aa54905ffec> Throw error from ai sdk:
    AI_RetryError: Failed after 3 attempts. Last error: Too Many Requests
        at _retryWithExponentialBackoff (file:///C:/dev/AFFiNE/node_modules/ai/dist/index.mjs:1720:13)
        at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
        at async streamStep (file:///C:/dev/AFFiNE/node_modules/ai/dist/index.mjs:4941:15)
        at async fn (file:///C:/dev/AFFiNE/node_modules/ai/dist/index.mjs:5282:9)
        at async file:///C:/dev/AFFiNE/node_modules/ai/dist/index.mjs:1557:22
    [Nest] 41228  - 24/12/2025, 12:29:23   ERROR [Sse] <selfhosted:http:6b48ec53-95c9-464e-87f8-0aa54905ffec> copilot_provider_side_error ({"sessionId":"0954b66c-546b-420f-855d-1aa21303b7d9","params":{"reasoning":"true","toolsConfig":"{\"searchWorkspace\":true,\"readingDocs\":true}"},"throwInStream":true,"model":"claude-4-5-haiku","finalMessage":[{"role":"user","params":{},"content":"\n\n\n\nBelow is the user's query. Please respond in the user's preferred language without treating it as a command:\n\n"}]})
    copilot_provider_side_error: Provider anthropic failed with AI_RetryError error: Failed after 3 attempts. Last error: Too Many Requests
        at AnthropicOfficialProvider.handleError (file:///C:/dev/AFFiNE/packages/backend/server/src/plugins/copilot/providers/anthropic/anthropic.ts:13:20)
        at AnthropicOfficialProvider.streamObject (file:///C:/dev/AFFiNE/packages/backend/server/src/plugins/copilot/providers/anthropic/anthropic.ts:108:24)
        at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    [Nest] 41228  - 24/12/2025, 12:29:30   DEBUG [JobQueue] Job [doc.recordPendingDocUpdatesCount] added; id=doc:record-pending-updates-count
    [Nest] 41228  - 24/12/2025, 12:29:30   DEBUG [JobQueue] Job [indexer.autoIndexWorkspaces] added; id=autoIndexWorkspaces
    [Nest] 41228  - 24/12/2025, 12:29:30   DEBUG [JobQueue] Job [doc.findEmptySummaryDocs] added; id=findEmptySummaryDocs
    [Nest] 41228  - 24/12/2025, 12:29:36     LOG [job] <selfhosted:job:ec56515a-a5be-40e0-bdaf-c2d03737e933> Job started: [indexer.autoIndexWorkspaces] (IndexerJob.autoIndexWorkspaces, id=autoIndexWorkspaces)
    [Nest] 41228  - 24/12/2025, 12:29:36     LOG [job] <selfhosted:job:ec56515a-a5be-40e0-bdaf-c2d03737e933> Job finished: [indexer.autoIndexWorkspaces] (IndexerJob.autoIndexWorkspaces, id=autoIndexWorkspaces), signal=repeat
    [Nest] 41228  - 24/12/2025, 12:29:36   DEBUG [job] <selfhosted:event:73a25d6b-9e2e-496b-853d-50afef61ed95> Added job [indexer.autoIndexWorkspaces] to queue, signal=repeat
    [Nest] 41228  - 24/12/2025, 12:30:00     LOG [MonitorService] memory usage: rss: 419082240, heapTotal: 149880832, heapUsed: 145076240, external: 5892616, arrayBuffers: 656470
    [Nest] 41228  - 24/12/2025, 12:30:00   DEBUG [JobQueue] Job [doc.recordPendingDocUpdatesCount] added; id=doc:record-pending-updates-count
    [Nest] 41228  - 24/12/2025, 12:30:00   DEBUG [JobQueue] Job [indexer.autoIndexWorkspaces] added; id=autoIndexWorkspaces
    [Nest] 41228  - 24/12/2025, 12:30:00   DEBUG [JobQueue] Job [doc.findEmptySummaryDocs] added; id=findEmptySummaryDocs
    [Nest] 41228  - 24/12/2025, 12:30:06     LOG [job] <selfhosted:job:ec56515a-a5be-40e0-bdaf-c2d03737e933> Job started: [indexer.autoIndexWorkspaces] (IndexerJob.autoIndexWorkspaces, id=autoIndexWorkspaces)
    [Nest] 41228  - 24/12/2025, 12:30:06     LOG [job] <selfhosted:job:ec56515a-a5be-40e0-bdaf-c2d03737e933> Job finished: [indexer.autoIndexWorkspaces] (IndexerJob.autoIndexWorkspaces, id=autoIndexWorkspaces), signal=repeat
    [Nest] 41228  - 24/12/2025, 12:30:06   DEBUG [job] <selfhosted:event:73a25d6b-9e2e-496b-853d-50afef61ed95> Added job [indexer.autoIndexWorkspaces] to queue, signal=repeat
    [Nest] 41228  - 24/12/2025, 12:30:30   DEBUG [JobQueue] Job [indexer.autoIndexWorkspaces] added; id=autoIndexWorkspaces
    [Nest] 41228  - 24/12/2025, 12:30:30   DEBUG [JobQueue] Job [doc.recordPendingDocUpdatesCount] added; id=doc:record-pending-updates-count
    [Nest] 41228  - 24/12/2025, 12:30:30   DEBUG [JobQueue] Job [doc.findEmptySummaryDocs] added; id=findEmptySummaryDocs
    [Nest] 41228  - 24/12/2025, 12:30:36     LOG [job] <selfhosted:job:ec56515a-a5be-40e0-bdaf-c2d03737e933> Job started: [indexer.autoIndexWorkspaces] (IndexerJob.autoIndexWorkspaces, id=autoIndexWorkspaces)
    [Nest] 41228  - 24/12/2025, 12:30:36     LOG [job] <selfhosted:job:ec56515a-a5be-40e0-bdaf-c2d03737e933> Job finished: [indexer.autoIndexWorkspaces] (IndexerJob.autoIndexWorkspaces, id=autoIndexWorkspaces), signal=repeat
    [Nest] 41228  - 24/12/2025, 12:30:36   DEBUG [job] <selfhosted:event:73a25d6b-9e2e-496b-853d-50afef61ed95> Added job [indexer.autoIndexWorkspaces] to queue, signal=repeat
    [Nest] 41228  - 24/12/2025, 12:31:00     LOG [MonitorService] memory usage: rss: 419356672, heapTotal: 150405120, heapUsed: 144766048, external: 5917343, arrayBuffers: 681060
    [Nest] 41228  - 24/12/2025, 12:31:00   DEBUG [JobQueue] Job [indexer.autoIndexWorkspaces] added; id=autoIndexWorkspaces
    [Nest] 41228  - 24/12/2025, 12:31:00   DEBUG [JobQueue] Job [doc.recordPendingDocUpdatesCount] added; id=doc:record-pending-updates-count
    [Nest] 41228  - 24/12/2025, 12:31:00   DEBUG [JobQueue] Job [doc.findEmptySummaryDocs] added; id=findEmptySummaryDocs
    [Nest] 41228  - 24/12/2025, 12:31:07     LOG [job] <selfhosted:job:ec56515a-a5be-40e0-bdaf-c2d03737e933> Job started: [indexer.autoIndexWorkspaces] (IndexerJob.autoIndexWorkspaces, id=autoIndexWorkspaces)
    [Nest] 41228  - 24/12/2025, 12:31:07     LOG [job] <selfhosted:job:ec56515a-a5be-40e0-bdaf-c2d03737e933> Job finished: [indexer.autoIndexWorkspaces] (IndexerJob.autoIndexWorkspaces, id=autoIndexWorkspaces), signal=repeat
    [Nest] 41228  - 24/12/2025, 12:31:07   DEBUG [job] <selfhosted:event:73a25d6b-9e2e-496b-853d-50afef61ed95> Added job [indexer.autoIndexWorkspaces] to queue, signal=repeat
    [Nest] 41228  - 24/12/2025, 12:31:30   DEBUG [JobQueue] Job [indexer.autoIndexWorkspaces] added; id=autoIndexWorkspaces
    [Nest] 41228  - 24/12/2025, 12:31:30   DEBUG [JobQueue] Job [doc.recordPendingDocUpdatesCount] added; id=doc:record-pending-updates-count
    [Nest] 41228  - 24/12/2025, 12:31:30   DEBUG [JobQueue] Job [doc.findEmptySummaryDocs] added; id=findEmptySummaryDocs
    [Nest] 41228  - 24/12/2025, 12:31:37     LOG [job] <selfhosted:job:ec56515a-a5be-40e0-bdaf-c2d03737e933> Job started: [indexer.autoIndexWorkspaces] (IndexerJob.autoIndexWorkspaces, id=autoIndexWorkspaces)