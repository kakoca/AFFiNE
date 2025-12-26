litellm

16:02:57 - LiteLLM:INFO: mcp_server_manager.py:1972 - Found 0 MCP servers in database

16:02:57 - LiteLLM Proxy:INFO: proxy_server.py:3796 - Loading 0 search tool(s) from database into router

16:03:27 - LiteLLM:INFO: mcp_server_manager.py:1972 - Found 0 MCP servers in database

16:03:27 - LiteLLM Proxy:INFO: proxy_server.py:3796 - Loading 0 search tool(s) from database into router

16:03:57 - LiteLLM:INFO: mcp_server_manager.py:1972 - Found 0 MCP servers in database

16:03:57 - LiteLLM Proxy:INFO: proxy_server.py:3796 - Loading 0 search tool(s) from database into router

16:04:27 - LiteLLM:INFO: mcp_server_manager.py:1972 - Found 0 MCP servers in database

16:04:27 - LiteLLM Proxy:INFO: proxy_server.py:3796 - Loading 0 search tool(s) from database into router

16:04:39 - LiteLLM Router:INFO: router.py:3061 - ageneric_api_call_with_fallbacks(model=claude-4-5-haiku) Exception {"message":"Too many tokens per day, please wait before trying again."}

16:04:40 - LiteLLM Router:INFO: router.py:3061 - ageneric_api_call_with_fallbacks(model=claude-4-5-haiku) Exception {"message":"Too many tokens per day, please wait before trying again."}

16:04:41 - LiteLLM Router:INFO: router.py:3061 - ageneric_api_call_with_fallbacks(model=claude-4-5-haiku) Exception {"message":"Too many tokens per day, please wait before trying again."}

16:04:43 - LiteLLM Router:INFO: router.py:3061 - ageneric_api_call_with_fallbacks(model=claude-4-5-haiku) Exception {"message":"Too many tokens per day, please wait before trying again."}

16:04:45 - LiteLLM Router:INFO: router.py:4096 - Trying to fallback b/w models

16:04:45 - LiteLLM Router:INFO: fallback_event_handlers.py:128 - Falling back to model_group = claude-3-haiku

16:04:45 - LiteLLM Router:INFO: router.py:3061 - ageneric_api_call_with_fallbacks(model=claude-3-haiku) Exception {"message":"Too many tokens per day, please wait before trying again."}

16:04:47 - LiteLLM Router:INFO: router.py:3061 - ageneric_api_call_with_fallbacks(model=claude-3-haiku) Exception {"message":"Too many tokens per day, please wait before trying again."}

16:04:47 - LiteLLM Router:INFO: router.py:3061 - ageneric_api_call_with_fallbacks(model=claude-3-haiku) Exception {"message":"Too many tokens per day, please wait before trying again."}

16:04:49 - LiteLLM Router:INFO: router.py:3061 - ageneric_api_call_with_fallbacks(model=claude-3-haiku) Exception {"message":"Too many tokens per day, please wait before trying again."}

16:04:51 - LiteLLM Router:INFO: router.py:4096 - Trying to fallback b/w models

16:04:51 - LiteLLM Router:INFO: router.py:4203 - No fallback model group found for original model_group=claude-3-haiku. Fallbacks=[{'claude-4-5-sonnet': ['claude-3-5-sonnet', 'claude-3-sonnet']}, {'claude-4-5-haiku': ['claude-3-haiku']}, {'claude-3-5-sonnet': ['claude-3-sonnet', 'claude-3-haiku']}, {'claude-3-opus': ['claude-3-5-sonnet', 'claude-3-sonnet']}, {'titan-embed-text': ['titan-embed-text-v1']}]

16:04:51 - LiteLLM Router:ERROR: router.py:4225 - litellm.router.py::async_function_with_fallbacks() - Error occurred while trying to do fallbacks - {"message":"Too many tokens per day, please wait before trying again."}

Traceback (most recent call last):

File "/usr/lib/python3.13/site-packages/litellm/llms/custom_httpx/llm_http_handler.py", line 1887, in async_anthropic_messages_handler

    response = await async_httpx_client.post(

               ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

    ...<5 lines>...

    )

    ^

File "/usr/lib/python3.13/site-packages/litellm/litellm_core_utils/logging_utils.py", line 190, in async_wrapper

    result = await func(*args, **kwargs)

             ^^^^^^^^^^^^^^^^^^^^^^^^^^^

File "/usr/lib/python3.13/site-packages/litellm/llms/custom_httpx/http_handler.py", line 449, in post

    raise e

File "/usr/lib/python3.13/site-packages/litellm/llms/custom_httpx/http_handler.py", line 405, in post

    response.raise_for_status()

    ~~~~~~~~~~~~~~~~~~~~~~~~~^^

File "/usr/lib/python3.13/site-packages/httpx/\_models.py", line 829, in raise_for_status

    raise HTTPStatusError(message, request=request, response=self)

httpx.HTTPStatusError: Client error '429 Too Many Requests' for url 'https://bedrock-runtime.us-east-1.amazonaws.com/model/global.anthropic.claude-haiku-4-5-20251001-v1:0/invoke-with-response-stream'

For more information check: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/429⁠

During handling of the above exception, another exception occurred:

Traceback (most recent call last):

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

File "/usr/lib/python3.13/site-packages/litellm/router.py", line 3066, in \_ageneric_api_call_with_fallbacks_helper

    raise e

File "/usr/lib/python3.13/site-packages/litellm/router.py", line 3052, in \_ageneric_api_call_with_fallbacks_helper

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

File "/usr/lib/python3.13/site-packages/litellm/llms/custom_httpx/llm_http_handler.py", line 3595, in \_handle_error

    raise provider_config.get_error_class(

    ...<3 lines>...

    )

litellm.llms.base_llm.chat.transformation.BaseLLMException: {"message":"Too many tokens per day, please wait before trying again."}

During handling of the above exception, another exception occurred:

Traceback (most recent call last):

File "/usr/lib/python3.13/site-packages/litellm/llms/custom_httpx/llm_http_handler.py", line 1887, in async_anthropic_messages_handler

    response = await async_httpx_client.post(

               ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

    ...<5 lines>...

    )

    ^

File "/usr/lib/python3.13/site-packages/litellm/litellm_core_utils/logging_utils.py", line 190, in async_wrapper

    result = await func(*args, **kwargs)

             ^^^^^^^^^^^^^^^^^^^^^^^^^^^

File "/usr/lib/python3.13/site-packages/litellm/llms/custom_httpx/http_handler.py", line 449, in post

    raise e

File "/usr/lib/python3.13/site-packages/litellm/llms/custom_httpx/http_handler.py", line 405, in post

    response.raise_for_status()

    ~~~~~~~~~~~~~~~~~~~~~~~~~^^

File "/usr/lib/python3.13/site-packages/httpx/\_models.py", line 829, in raise_for_status

    raise HTTPStatusError(message, request=request, response=self)

httpx.HTTPStatusError: Client error '429 Too Many Requests' for url 'https://bedrock-runtime.us-east-1.amazonaws.com/model/anthropic.claude-3-haiku-20240307-v1:0/invoke-with-response-stream'

For more information check: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/429⁠

During handling of the above exception, another exception occurred:

Traceback (most recent call last):

File "/usr/lib/python3.13/site-packages/litellm/router.py", line 4208, in async_function_with_fallbacks_common_utils raise original_exception

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

File "/usr/lib/python3.13/site-packages/litellm/router.py", line 3066, in \_ageneric_api_call_with_fallbacks_helper

    raise e

File "/usr/lib/python3.13/site-packages/litellm/router.py", line 3052, in \_ageneric_api_call_with_fallbacks_helper

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

File "/usr/lib/python3.13/site-packages/litellm/llms/custom_httpx/llm_http_handler.py", line 3595, in \_handle_error

    raise provider_config.get_error_class(

    ...<3 lines>...

    )

litellm.llms.base_llm.chat.transformation.BaseLLMException: {"message":"Too many tokens per day, please wait before trying again."}

Debug Information:Cooldown Deployments=[]

16:04:51 - LiteLLM Router:ERROR: router.py:4225 - litellm.router.py::async_function_with_fallbacks() - Error occurred while trying to do fallbacks - {"message":"Too many tokens per day, please wait before trying again."}

Traceback (most recent call last):

File "/usr/lib/python3.13/site-packages/litellm/llms/custom_httpx/llm_http_handler.py", line 1887, in async_anthropic_messages_handler

    response = await async_httpx_client.post(

               ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

    ...<5 lines>...

    )

    ^

File "/usr/lib/python3.13/site-packages/litellm/litellm_core_utils/logging_utils.py", line 190, in async_wrapper

    result = await func(*args, **kwargs)

             ^^^^^^^^^^^^^^^^^^^^^^^^^^^

File "/usr/lib/python3.13/site-packages/litellm/llms/custom_httpx/http_handler.py", line 449, in post

    raise e

File "/usr/lib/python3.13/site-packages/litellm/llms/custom_httpx/http_handler.py", line 405, in post

    response.raise_for_status()

    ~~~~~~~~~~~~~~~~~~~~~~~~~^^

File "/usr/lib/python3.13/site-packages/httpx/\_models.py", line 829, in raise_for_status

    raise HTTPStatusError(message, request=request, response=self)

httpx.HTTPStatusError: Client error '429 Too Many Requests' for url 'https://bedrock-runtime.us-east-1.amazonaws.com/model/global.anthropic.claude-haiku-4-5-20251001-v1:0/invoke-with-response-stream'

For more information check: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/429⁠

During handling of the above exception, another exception occurred:

Traceback (most recent call last):

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

File "/usr/lib/python3.13/site-packages/litellm/router.py", line 3066, in \_ageneric_api_call_with_fallbacks_helper

    raise e

File "/usr/lib/python3.13/site-packages/litellm/router.py", line 3052, in \_ageneric_api_call_with_fallbacks_helper

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

File "/usr/lib/python3.13/site-packages/litellm/llms/custom_httpx/llm_http_handler.py", line 3595, in \_handle_error

    raise provider_config.get_error_class(

    ...<3 lines>...

    )

litellm.llms.base_llm.chat.transformation.BaseLLMException: {"message":"Too many tokens per day, please wait before trying again."}

During handling of the above exception, another exception occurred:

Traceback (most recent call last):

File "/usr/lib/python3.13/site-packages/litellm/router.py", line 4217, in async_function_with_fallbacks_common_utils

    response = await run_async_fallback(

               ^^^^^^^^^^^^^^^^^^^^^^^^^

    ...<2 lines>...

    )

    ^

File "/usr/lib/python3.13/site-packages/litellm/router_utils/fallback_event_handlers.py", line 161, in run_async_fallback

    raise error_from_fallbacks

File "/usr/lib/python3.13/site-packages/litellm/router_utils/fallback_event_handlers.py", line 139, in run_async_fallback

    response = await litellm_router.async_function_with_fallbacks(

               ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

        *args, **kwargs

        ^^^^^^^^^^^^^^^

    )

    ^

File "/usr/lib/python3.13/site-packages/litellm/router.py", line 4292, in async_function_with_fallbacks

    return await self.async_function_with_fallbacks_common_utils(

           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

    ...<8 lines>...

    )

    ^

File "/usr/lib/python3.13/site-packages/litellm/router.py", line 4250, in async_function_with_fallbacks_common_utils

    raise original_exception

File "/usr/lib/python3.13/site-packages/litellm/router.py", line 4208, in async_function_with_fallbacks_common_utils

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

File "/usr/lib/python3.13/site-packages/litellm/router.py", line 3066, in \_ageneric_api_call_with_fallbacks_helper

    raise e

File "/usr/lib/python3.13/site-packages/litellm/router.py", line 3052, in \_ageneric_api_call_with_fallbacks_helper

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

File "/usr/lib/python3.13/site-packages/litellm/llms/custom_httpx/llm_http_handler.py", line 3595, in \_handle_error

    raise provider_config.get_error_class(

    ...<3 lines>...

    )

litellm.llms.base_llm.chat.transformation.BaseLLMException: {"message":"Too many tokens per day, please wait before trying again."}

Debug Information:

Cooldown Deployments=[]

16:04:51 - LiteLLM Proxy:ERROR: endpoints.py:219 - litellm.proxy.proxy_server.anthropic_response(): Exception occured - {"message":"Too many tokens per day, please wait before trying again."}

Traceback (most recent call last):

File "/usr/lib/python3.13/site-packages/litellm/llms/custom_httpx/llm_http_handler.py", line 1887, in async_anthropic_messages_handler

    response = await async_httpx_client.post(

               ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

    ...<5 lines>...

    )

    ^

File "/usr/lib/python3.13/site-packages/litellm/litellm_core_utils/logging_utils.py", line 190, in async_wrapper

    result = await func(*args, **kwargs)

             ^^^^^^^^^^^^^^^^^^^^^^^^^^^

File "/usr/lib/python3.13/site-packages/litellm/llms/custom_httpx/http_handler.py", line 449, in post

    raise e

File "/usr/lib/python3.13/site-packages/litellm/llms/custom_httpx/http_handler.py", line 405, in post

    response.raise_for_status()

    ~~~~~~~~~~~~~~~~~~~~~~~~~^^

File "/usr/lib/python3.13/site-packages/httpx/\_models.py", line 829, in raise_for_status

    raise HTTPStatusError(message, request=request, response=self)

httpx.HTTPStatusError: Client error '429 Too Many Requests' for url 'https://bedrock-runtime.us-east-1.amazonaws.com/model/global.anthropic.claude-haiku-4-5-20251001-v1:0/invoke-with-response-stream'

For more information check: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/429⁠

During handling of the above exception, another exception occurred:

Traceback (most recent call last):

File "/usr/lib/python3.13/site-packages/litellm/proxy/anthropic_endpoints/endpoints.py", line 153, in anthropic_response

    responses = await llm_responses

                ^^^^^^^^^^^^^^^^^^^

File "/usr/lib/python3.13/site-packages/litellm/router.py", line 3965, in async_wrapper

    return await self._ageneric_api_call_with_fallbacks(

           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

    ...<2 lines>...

    )

    ^

File "/usr/lib/python3.13/site-packages/litellm/router.py", line 2954, in \_ageneric_api_call_with_fallbacks

    raise e

File "/usr/lib/python3.13/site-packages/litellm/router.py", line 2941, in \_ageneric_api_call_with_fallbacks

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

File "/usr/lib/python3.13/site-packages/litellm/router.py", line 3066, in \_ageneric_api_call_with_fallbacks_helper

    raise e

File "/usr/lib/python3.13/site-packages/litellm/router.py", line 3052, in \_ageneric_api_call_with_fallbacks_helper

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

File "/usr/lib/python3.13/site-packages/litellm/llms/custom_httpx/llm_http_handler.py", line 3595, in \_handle_error

    raise provider_config.get_error_class(

    ...<3 lines>...

    )

litellm.llms.base_llm.chat.transformation.BaseLLMException: {"message":"Too many tokens per day, please wait before trying again."}

#------------------------------------------------------------#

#

# 'I get frustrated when the product...'

# https://github.com/BerriAI/litellm/issues/new⁠

#

#------------------------------------------------------------#

Thank you for using LiteLLM! - Krrish & Ishaan

Give Feedback / Get Help: https://github.com/BerriAI/litellm/issues/new⁠

LiteLLM: Proxy initialized with Config, Set models:

    claude-4-5-sonnet

    claude-4-5-haiku

    claude-3-5-sonnet

    claude-3-opus

    claude-3-sonnet

    claude-3-haiku

    text-embedding-ada-002

    titan-embed-text

    gemini-embedding-001

    titan-embed-text-v1

INFO: 172.21.0.1:52942 - "POST /v1/messages HTTP/1.1" 429 Too Many Requests

16:04:54 - LiteLLM Router:INFO: router.py:3061 - ageneric_api_call_with_fallbacks(model=claude-4-5-haiku) Exception {"message":"Too many tokens per day, please wait before trying again."}

16:04:55 - LiteLLM Router:INFO: router.py:3061 - ageneric_api_call_with_fallbacks(model=claude-4-5-haiku) Exception {"message":"Too many tokens per day, please wait before trying again."}

16:04:56 - LiteLLM Router:INFO: router.py:3061 - ageneric_api_call_with_fallbacks(model=claude-4-5-haiku) Exception {"message":"Too many tokens per day, please wait before trying again."}

16:04:57 - LiteLLM:INFO: mcp_server_manager.py:1972 - Found 0 MCP servers in database

16:04:57 - LiteLLM Proxy:INFO: proxy_server.py:3796 - Loading 0 search tool(s) from database into router

16:04:57 - LiteLLM Router:INFO: router.py:3061 - ageneric_api_call_with_fallbacks(model=claude-4-5-haiku) Exception {"message":"Too many tokens per day, please wait before trying again."}

16:05:00 - LiteLLM Router:INFO: router.py:4096 - Trying to fallback b/w models

16:05:00 - LiteLLM Router:INFO: fallback_event_handlers.py:128 - Falling back to model_group = claude-3-haiku

16:05:00 - LiteLLM Router:INFO: router.py:3061 - ageneric_api_call_with_fallbacks(model=claude-3-haiku) Exception {"message":"Too many tokens per day, please wait before trying again."}

16:05:01 - LiteLLM Router:INFO: router.py:3061 - ageneric_api_call_with_fallbacks(model=claude-3-haiku) Exception {"message":"Too many tokens per day, please wait before trying again."}

16:05:02 - LiteLLM Router:INFO: router.py:3061 - ageneric_api_call_with_fallbacks(model=claude-3-haiku) Exception {"message":"Too many tokens per day, please wait before trying again."}

16:05:04 - LiteLLM Router:INFO: router.py:3061 - ageneric_api_call_with_fallbacks(model=claude-3-haiku) Exception {"message":"Too many tokens per day, please wait before trying again."}

16:05:06 - LiteLLM Router:INFO: router.py:4096 - Trying to fallback b/w models

16:05:06 - LiteLLM Router:INFO: router.py:4203 - No fallback model group found for original model_group=claude-3-haiku. Fallbacks=[{'claude-4-5-sonnet': ['claude-3-5-sonnet', 'claude-3-sonnet']}, {'claude-4-5-haiku': ['claude-3-haiku']}, {'claude-3-5-sonnet': ['claude-3-sonnet', 'claude-3-haiku']}, {'claude-3-opus': ['claude-3-5-sonnet', 'claude-3-sonnet']}, {'titan-embed-text': ['titan-embed-text-v1']}]

16:05:06 - LiteLLM Router:ERROR: router.py:4225 - litellm.router.py::async_function_with_fallbacks() - Error occurred while trying to do fallbacks - {"message":"Too many tokens per day, please wait before trying again."}

Traceback (most recent call last):

File "/usr/lib/python3.13/site-packages/litellm/llms/custom_httpx/llm_http_handler.py", line 1887, in async_anthropic_messages_handler

    response = await async_httpx_client.post(

               ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

    ...<5 lines>...

    )

    ^

File "/usr/lib/python3.13/site-packages/litellm/litellm_core_utils/logging_utils.py", line 190, in async_wrapper

    result = await func(*args, **kwargs)

             ^^^^^^^^^^^^^^^^^^^^^^^^^^^

File "/usr/lib/python3.13/site-packages/litellm/llms/custom_httpx/http_handler.py", line 449, in post

    raise e

File "/usr/lib/python3.13/site-packages/litellm/llms/custom_httpx/http_handler.py", line 405, in post

    response.raise_for_status()

    ~~~~~~~~~~~~~~~~~~~~~~~~~^^

File "/usr/lib/python3.13/site-packages/httpx/\_models.py", line 829, in raise_for_status

    raise HTTPStatusError(message, request=request, response=self)

httpx.HTTPStatusError: Client error '429 Too Many Requests' for url 'https://bedrock-runtime.us-east-1.amazonaws.com/model/global.anthropic.claude-haiku-4-5-20251001-v1:0/invoke-with-response-stream'

For more information check: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/429⁠

During handling of the above exception, another exception occurred:

Traceback (most recent call last):

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

File "/usr/lib/python3.13/site-packages/litellm/router.py", line 3066, in \_ageneric_api_call_with_fallbacks_helper

    raise e

File "/usr/lib/python3.13/site-packages/litellm/router.py", line 3052, in \_ageneric_api_call_with_fallbacks_helper

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

File "/usr/lib/python3.13/site-packages/litellm/llms/custom_httpx/llm_http_handler.py", line 3595, in \_handle_error

    raise provider_config.get_error_class(

    ...<3 lines>...

    )

litellm.llms.base_llm.chat.transformation.BaseLLMException: {"message":"Too many tokens per day, please wait before trying again."}

During handling of the above exception, another exception occurred:

Traceback (most recent call last):

File "/usr/lib/python3.13/site-packages/litellm/llms/custom_httpx/llm_http_handler.py", line 1887, in async_anthropic_messages_handler

    response = await async_httpx_client.post(

               ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

    ...<5 lines>...

    )

    ^

File "/usr/lib/python3.13/site-packages/litellm/litellm_core_utils/logging_utils.py", line 190, in async_wrapper

    result = await func(*args, **kwargs)

             ^^^^^^^^^^^^^^^^^^^^^^^^^^^

File "/usr/lib/python3.13/site-packages/litellm/llms/custom_httpx/http_handler.py", line 449, in post

    raise e

File "/usr/lib/python3.13/site-packages/litellm/llms/custom_httpx/http_handler.py", line 405, in post

    response.raise_for_status()

    ~~~~~~~~~~~~~~~~~~~~~~~~~^^

File "/usr/lib/python3.13/site-packages/httpx/\_models.py", line 829, in raise_for_status

    raise HTTPStatusError(message, request=request, response=self)

httpx.HTTPStatusError: Client error '429 Too Many Requests' for url 'https://bedrock-runtime.us-east-1.amazonaws.com/model/anthropic.claude-3-haiku-20240307-v1:0/invoke-with-response-stream'

For more information check: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/429⁠

During handling of the above exception, another exception occurred:

Traceback (most recent call last):

File "/usr/lib/python3.13/site-packages/litellm/router.py", line 4208, in async_function_with_fallbacks_common_utils

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

File "/usr/lib/python3.13/site-packages/litellm/router.py", line 3066, in \_ageneric_api_call_with_fallbacks_helper

    raise e

File "/usr/lib/python3.13/site-packages/litellm/router.py", line 3052, in \_ageneric_api_call_with_fallbacks_helper

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

File "/usr/lib/python3.13/site-packages/litellm/llms/custom_httpx/llm_http_handler.py", line 3595, in \_handle_error

    raise provider_config.get_error_class(

    ...<3 lines>...

    )

litellm.llms.base_llm.chat.transformation.BaseLLMException: {"message":"Too many tokens per day, please wait before trying again."}

Debug Information:

Cooldown Deployments=[]

16:05:06 - LiteLLM Router:ERROR: router.py:4225 - litellm.router.py::async_function_with_fallbacks() - Error occurred while trying to do fallbacks - {"message":"Too many tokens per day, please wait before trying again."}

Traceback (most recent call last):

File "/usr/lib/python3.13/site-packages/litellm/llms/custom_httpx/llm_http_handler.py", line 1887, in async_anthropic_messages_handler

    response = await async_httpx_client.post(

               ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

    ...<5 lines>...

    )

    ^

File "/usr/lib/python3.13/site-packages/litellm/litellm_core_utils/logging_utils.py", line 190, in async_wrapper

    result = await func(*args, **kwargs)

             ^^^^^^^^^^^^^^^^^^^^^^^^^^^

File "/usr/lib/python3.13/site-packages/litellm/llms/custom_httpx/http_handler.py", line 449, in post

    raise e

File "/usr/lib/python3.13/site-packages/litellm/llms/custom_httpx/http_handler.py", line 405, in post

    response.raise_for_status()

    ~~~~~~~~~~~~~~~~~~~~~~~~~^^

File "/usr/lib/python3.13/site-packages/httpx/\_models.py", line 829, in raise_for_status

    raise HTTPStatusError(message, request=request, response=self)

httpx.HTTPStatusError: Client error '429 Too Many Requests' for url 'https://bedrock-runtime.us-east-1.amazonaws.com/model/global.anthropic.claude-haiku-4-5-20251001-v1:0/invoke-with-response-stream'

For more information check: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/429⁠

During handling of the above exception, another exception occurred:

Traceback (most recent call last):

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

File "/usr/lib/python3.13/site-packages/litellm/router.py", line 3066, in \_ageneric_api_call_with_fallbacks_helper

    raise e

File "/usr/lib/python3.13/site-packages/litellm/router.py", line 3052, in \_ageneric_api_call_with_fallbacks_helper

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

File "/usr/lib/python3.13/site-packages/litellm/llms/custom_httpx/llm_http_handler.py", line 3595, in \_handle_error

    raise provider_config.get_error_class(

    ...<3 lines>...

    )

litellm.llms.base_llm.chat.transformation.BaseLLMException: {"message":"Too many tokens per day, please wait before trying again."}

During handling of the above exception, another exception occurred:

Traceback (most recent call last):

File "/usr/lib/python3.13/site-packages/litellm/router.py", line 4217, in async_function_with_fallbacks_common_utils

    response = await run_async_fallback(

               ^^^^^^^^^^^^^^^^^^^^^^^^^

    ...<2 lines>...

    )

    ^

File "/usr/lib/python3.13/site-packages/litellm/router_utils/fallback_event_handlers.py", line 161, in run_async_fallback

    raise error_from_fallbacks

File "/usr/lib/python3.13/site-packages/litellm/router_utils/fallback_event_handlers.py", line 139, in run_async_fallback

    response = await litellm_router.async_function_with_fallbacks(

               ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

        *args, **kwargs

        ^^^^^^^^^^^^^^^
